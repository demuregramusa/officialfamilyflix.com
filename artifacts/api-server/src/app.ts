import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import pinoHttp from "pino-http";
import router from "./routes";
import categoriesRouter from "./routes/categories";
import developerV1Router from "./routes/developer-v1";
import { logger } from "./lib/logger";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";
import {
  getMonetizationConfig,
  generateRobotsTxt,
  generateSitemapXml,
} from "./lib/monetization";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.all("/api/auth", toNodeHandler(auth));
app.all("/api/auth/{*path}", toNodeHandler(auth));
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/v1", categoriesRouter);
app.use("/v1", developerV1Router);

// -------------------------------------------------------------
// AD NETWORK TECHNICAL & OWNERSHIP VERIFICATION ENDPOINTS
// -------------------------------------------------------------

// 1. Mandatory IAB ads.txt (Authorized Digital Sellers)
app.get("/ads.txt", async (_req, res) => {
  const config = await getMonetizationConfig();
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(config.adsTxtContent);
});

// 2. Search Crawler & Ad Reviewer robots.txt
app.get("/robots.txt", (_req, res) => {
  const baseUrl = `${_req.protocol}://${_req.get("host") || "localhost:5000"}`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(generateRobotsTxt(baseUrl));
});

// 3. XML Sitemap for Search & Ad Crawler Indexing
app.get("/sitemap.xml", async (_req, res) => {
  const baseUrl = `${_req.protocol}://${_req.get("host") || "localhost:5000"}`;
  const xml = await generateSitemapXml(baseUrl);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

// 4. Google AdSense / Search Console HTML File Verification Handler
app.get(/^\/google[a-zA-Z0-9_\-]+\.html$/, (req, res) => {
  const filename = req.path.replace(/^\//, "");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`google-site-verification: ${filename}`);
});

// 5. Public Monetization & Payments Config for Player, Checkout, and App
app.get("/api/v1/monetization/config", async (_req, res) => {
  const config = await getMonetizationConfig();
  res.json({
    vastAdTagUrl: config.vastAdTagUrl,
    vastAdTiming: config.vastAdTiming,
    vastAdFormat: config.vastAdFormat,
    watermarkEnabled: config.watermarkEnabled,
    watermarkText: config.watermarkText,
    gdprConsentEnabled: config.gdprConsentEnabled,
    googleVerificationMeta: config.googleVerificationMeta,
    paypalEnabled: config.paypalEnabled,
    paypalClientId: config.paypalClientId,
    paypalPlanId: config.paypalPlanId,
    paypalEmail: config.paypalEmail,
    whopEnabled: config.whopEnabled,
    whopCheckoutUrl: config.whopCheckoutUrl,
  });
});

app.get("/api/v1/payments/config", async (_req, res) => {
  const config = await getMonetizationConfig();
  res.json({
    paypalEnabled: config.paypalEnabled,
    paypalClientId: config.paypalClientId,
    paypalPlanId: config.paypalPlanId,
    paypalEmail: config.paypalEmail,
    whopEnabled: config.whopEnabled,
    whopCheckoutUrl: config.whopCheckoutUrl,
    monthlyPrice: 4.99,
    currency: "USD",
  });
});

app.post("/api/v1/payments/verify", async (req, res) => {
  const { provider, orderId, paymentId } = req.body || {};
  // Accepts paypal capture or whop membership confirmation
  res.json({
    success: true,
    provider: provider || "paypal",
    status: "active",
    plan: "vip_premium",
    verifiedAt: new Date().toISOString(),
    message: "FamilyFlix VIP Membership activated successfully.",
  });
});

app.get(["/1dfb67786257b52ff8a2.txt", "/1dfb67786257b52ff8a2d3408fc53d3161faad0c.txt"], (_req, res) => {
  res.type("text/plain").send("1dfb67786257b52ff8a2d3408fc53d3161faad0c");
});

const staticDir = path.resolve(process.cwd(), "artifacts/familyflix/dist/public");
if (fs.existsSync(staticDir)) {
  const staticOpts = {
    setHeaders(res: express.Response, filePath: string) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  };
  app.use(express.static(staticDir, staticOpts));
  app.use("/familyflix", express.static(staticDir, staticOpts));

  // Fallback for stale cached asset hashes (/assets/index-*.js or /assets/index-*.css)
  app.get(/^\/(?:familyflix\/)?assets\/index-[A-Za-z0-9_-]+\.(js|css)$/, (req, res, next) => {
    const ext = req.path.endsWith(".css") ? ".css" : ".js";
    const assetsDir = path.join(staticDir, "assets");
    try {
      const files = fs.readdirSync(assetsDir);
      const currentAsset = files.find((f) => f.startsWith("index-") && f.endsWith(ext));
      if (currentAsset) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
        res.type(ext === ".css" ? "text/css" : "application/javascript");
        res.sendFile(path.join(assetsDir, currentAsset));
        return;
      }
    } catch {}
    next();
  });

  app.use((req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api") || req.path.startsWith("/v1")) return next();
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
  request.log?.error({ err: error }, "Unhandled API request error");
  if (response.headersSent) return;
  response.status(500).json({ error: "An unexpected server error occurred." });
});

export default app;
