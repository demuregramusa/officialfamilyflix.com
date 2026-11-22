import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { pool } from "@workspace/db";
import { logger } from "./logger";

export interface AuthenticatedDeveloperKey {
  keyId: string;
  projectId: string;
  organizationId: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  rateLimitPerMin: number;
  rateLimitPerDay: number;
}

// In-memory sliding window rate limiter
interface RateLimitBucket {
  minuteCount: number;
  minuteResetAt: number;
  dayCount: number;
  dayResetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export async function apiGatewayMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.header("authorization") || "";
  const apiKeyHeader = req.header("x-api-key") || "";

  let rawKey = "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    rawKey = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    rawKey = apiKeyHeader.trim();
  }

  // If no API key is provided, check if developer session is active (for portal or playground testing)
  if (!rawKey) {
    // If not a key, allow public reading if endpoint allows it or reject with 401
    res.status(401).json({
      error: {
        code: "unauthorized",
        message: "Missing API key. Provide your API key using 'Authorization: Bearer <key>' or 'x-api-key: <key>'.",
        docs_url: "https://developers.familyflix.com/docs/authentication",
      },
    });
    return;
  }

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const client = await pool.connect();

  try {

    const keyRes = await client.query(`
      SELECT
        k.id as key_id,
        k.project_id,
        k.name,
        k.key_prefix,
        k.scopes,
        k.rate_limit_per_min,
        k.rate_limit_per_day,
        k.status,
        k.expires_at,
        p.organization_id
      FROM api_key_credentials k
      INNER JOIN developer_projects p ON k.project_id = p.id
      WHERE k.key_hash = $1
    `, [keyHash]);

    if (keyRes.rows.length === 0) {
      res.status(401).json({
        error: {
          code: "invalid_api_key",
          message: "The provided API key is invalid or does not exist.",
        },
      });
      return;
    }

    const keyData = keyRes.rows[0];

    if (keyData.status !== "active") {
      res.status(403).json({
        error: {
          code: "api_key_revoked",
          message: `This API key has been ${keyData.status}. Please generate a new key in your developer dashboard.`,
        },
      });
      return;
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      res.status(403).json({
        error: {
          code: "api_key_expired",
          message: "This API key has expired.",
        },
      });
      return;
    }

    // Rate Limiting Enforcement
    const now = Date.now();
    let bucket = rateLimitBuckets.get(keyData.key_id);
    if (!bucket || now >= bucket.minuteResetAt) {
      bucket = {
        minuteCount: 0,
        minuteResetAt: now + 60000,
        dayCount: bucket && now < bucket.dayResetAt ? bucket.dayCount : 0,
        dayResetAt: bucket && now < bucket.dayResetAt ? bucket.dayResetAt : now + 86400000,
      };
      rateLimitBuckets.set(keyData.key_id, bucket);
    }

    bucket.minuteCount++;
    bucket.dayCount++;

    const limit = keyData.rate_limit_per_min || 120;
    const remaining = Math.max(0, limit - bucket.minuteCount);
    const resetSeconds = Math.ceil((bucket.minuteResetAt - now) / 1000);

    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.floor(bucket.minuteResetAt / 1000)));
    res.setHeader("X-FamilyFlix-Request-Id", crypto.randomUUID());

    if (bucket.minuteCount > limit) {
      res.setHeader("Retry-After", String(resetSeconds));
      res.status(429).json({
        error: {
          code: "rate_limit_exceeded",
          message: `Rate limit of ${limit} requests per minute exceeded. Please slow down your requests.`,
          retry_after: resetSeconds,
          current_usage: bucket.minuteCount,
          limit,
        },
      });
      return;
    }

    // Attach developer key data to request
    (req as any).developerKey = {
      keyId: keyData.key_id,
      projectId: keyData.project_id,
      organizationId: keyData.organization_id,
      keyPrefix: keyData.key_prefix,
      name: keyData.name,
      scopes: Array.isArray(keyData.scopes) ? keyData.scopes : ["*"],
      rateLimitPerMin: limit,
      rateLimitPerDay: keyData.rate_limit_per_day || 10000,
    };

    // Update last_used_at asynchronously
    client.query('UPDATE api_key_credentials SET last_used_at = now() WHERE id = $1', [keyData.key_id]).catch(() => {});

    // Hook response finish to log usage event
    const startTime = Date.now();
    res.on("finish", () => {
      const latency = Date.now() - startTime;
      client.query(`
        INSERT INTO api_usage_events (key_id, project_id, organization_id, endpoint, method, status_code, latency_ms, tokens_used, credits_deducted, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        keyData.key_id,
        keyData.project_id,
        keyData.organization_id,
        req.path,
        req.method,
        res.statusCode,
        latency,
        (res as any).tokensUsed || 0,
        (res as any).creditsDeducted || 1,
        req.ip || "127.0.0.1",
      ]).catch(() => {});
    });

    next();
  } catch (err) {
    logger.error({ err }, "API Gateway Middleware Error");
    res.status(500).json({ error: "Internal API Gateway Error" });
  } finally {
    client.release();
  }
}
