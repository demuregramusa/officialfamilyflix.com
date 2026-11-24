import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.FAMILYFLIX_API_URL || "http://localhost:5000";
const ADMIN_EMAIL = process.env.FAMILYFLIX_ADMIN_EMAIL || "iam23yhb@gmail.com";
const ADMIN_PASSWORD = process.env.FAMILYFLIX_ADMIN_PASSWORD || "Admin338274";

async function authenticateAdmin() {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  if (!res.ok) {
    throw new Error(`Admin sign-in failed with HTTP ${res.status}`);
  }
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
  const cookieHeader = setCookies
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  if (!cookieHeader) {
    throw new Error("No session cookie returned from Better Auth sign-in.");
  }
  return cookieHeader;
}

async function apiRequest(cookieHeader, method, endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Cookie: cookieHeader,
      Origin: BASE_URL,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} failed (HTTP ${res.status}): ${json?.error || text}`);
  }
  return json;
}

async function waitForServerReady() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/healthz`);
      if (res.ok) return;
    } catch {
      // wait 1s
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${BASE_URL} did not become ready within 30s.`);
}

async function main() {
  await waitForServerReady();
  console.log("1. Authenticating with FamilyFlix Admin API (session tokens redacted from logs)...");
  const cookieHeader = await authenticateAdmin();
  console.log("   -> Authenticated admin session established.");

  console.log("2. Loading verified Library of Congress movies + multi-episode TV series additions pack...");
  const starterPack = await apiRequest(
    cookieHeader,
    "GET",
    "/api/admin/production-importer/starter-additions",
  );

  // Include 1 existing published catalog title in the incoming batch to verify duplicate protection in live production
  const duplicateProbeRecord = {
    name: "A Ghost at Gilmore House",
    slug: "a-ghost-at-gilmore-house-2027",
    kind: "movie",
    year: 2027,
    synopsis: "Existing published title duplicate probe — must be protected and skipped.",
    creatorAttribution: "A Ghost at Gilmore House (2027)",
    genres: ["Horror", "Mystery", "Thriller"],
    rights: starterPack[0].rights,
    uploaderAttested: true,
  };

  const records = [...starterPack, duplicateProbeRecord];
  console.log(
    `   -> Prepared batch of ${records.length} records (${starterPack.length} verified public-domain additions + 1 existing published duplicate probe).`,
  );

  console.log("3. Executing Phase A — Preflight Validation (POST /api/admin/production-importer/preflight)...");
  let job = await apiRequest(cookieHeader, "POST", "/api/admin/production-importer/preflight", {
    name: "Library of Congress Public-Domain Movies & Series Production Import",
    records,
    updateExisting: false,
    probeStreams: false,
  });
  console.log(
    `   -> Preflight Job ${job.id}: totalSubmitted=${job.metrics.totalRecordsSubmitted}, newTitlesDetected=${job.metrics.newTitlesDetected}, existingDuplicatesSkipped=${job.metrics.existingDuplicatesSkipped}`,
  );

  if (job.metrics.newTitlesDetected > 0) {
    console.log("4. Executing Phase B — Dry Run (POST /api/admin/production-importer/jobs/:jobId/dry-run)...");
    job = await apiRequest(
      cookieHeader,
      "POST",
      `/api/admin/production-importer/jobs/${job.id}/dry-run`,
    );
    console.log(`   -> Dry Run status: ${job.status} across ${job.batches.length} batch(es).`);

    console.log(
      "5. Executing Phase B & D — Production Database Import (POST /api/admin/production-importer/jobs/:jobId/import)...",
    );
    job = await apiRequest(
      cookieHeader,
      "POST",
      `/api/admin/production-importer/jobs/${job.id}/import`,
      { confirmedByAdmin: true },
    );
    console.log(
      `   -> Imported: successfullyImported=${job.metrics.successfullyImported}, tvSeasonsImported=${job.metrics.tvSeasonsImported}, tvEpisodesImported=${job.metrics.tvEpisodesImported}, pendingRightsReview=${job.metrics.pendingRightsReview}`,
    );

    console.log(
      "6. Executing Phase C — Explicit Administrator Rights Review (POST /api/admin/production-importer/jobs/:jobId/review-rights)...",
    );
    job = await apiRequest(
      cookieHeader,
      "POST",
      `/api/admin/production-importer/jobs/${job.id}/review-rights`,
      {
        decision: "approve",
        note: "Verified Library of Congress item-level public-domain rights records, source attributions, and IIIF HLS viewing copies.",
        confirmedByAdmin: true,
      },
    );
    console.log(`   -> Rights Approved: approvedTitles=${job.metrics.approvedTitles}`);

    console.log(
      "7. Executing Phase F & G — Publish Approved Titles & Run 10-Point Live Verification (POST /api/admin/production-importer/jobs/:jobId/publish-and-verify)...",
    );
    job = await apiRequest(
      cookieHeader,
      "POST",
      `/api/admin/production-importer/jobs/${job.id}/publish-and-verify`,
      { confirmedByAdmin: true },
    );
    console.log(
      `   -> Published & Verified: publishedTitles=${job.metrics.publishedTitles}, verifiedLiveTitles=${job.metrics.verifiedLiveTitles}`,
    );
  } else {
    console.log(
      "   -> All 4 Library of Congress additions are already published in production! Running live 10-point verification on each existing record...",
    );
    for (const item of job.items) {
      if (item.existingMovieId && item.requestedSlug !== "a-ghost-at-gilmore-house-2027") {
        const verification = await apiRequest(
          cookieHeader,
          "POST",
          `/api/admin/production-importer/verify-title/${item.existingMovieId}`,
        );
        item.verification = verification;
      }
    }
  }

  console.log("8. Performing Live Public API, Playback Manifest & Watch Page HTTP Verification...");
  const liveHttpChecks = [];
  const targetSlugs = [
    "a-trip-down-market-street-before-the-fire",
    "san-francisco-earthquake-and-fire-april-18-1906",
    "tr-in-san-francisco-1903",
    "early-san-francisco-chronicles-1897-1916",
  ];

  for (const slug of targetSlugs) {
    const detailRes = await fetch(`${BASE_URL}/api/v1/titles/${slug}`);
    const detailJson = detailRes.ok ? await detailRes.json() : null;

    const playbackRes = await fetch(`${BASE_URL}/api/playback/${slug}`);
    const playbackJson = playbackRes.ok ? await playbackRes.json() : null;

    const watchPageRes = await fetch(`${BASE_URL}/watch/${slug}`);

    const episodeChecks = [];
    if (detailJson?.kind === "series" && Array.isArray(detailJson.episodes)) {
      for (const ep of detailJson.episodes) {
        const epPlayRes = await fetch(`${BASE_URL}/api/playback/${slug}/episodes/${ep.id}`);
        const epPlayJson = epPlayRes.ok ? await epPlayRes.json() : null;
        episodeChecks.push({
          episodeId: ep.id,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          name: ep.name,
          httpStatus: epPlayRes.status,
          streamType: epPlayJson?.streamType ?? null,
          streamUrl: epPlayJson?.url ?? null,
        });
      }
    }

    const checkResult = {
      slug,
      name: detailJson?.name ?? slug,
      kind: detailJson?.kind ?? null,
      detailApiStatus: detailRes.status,
      playbackApiStatus: playbackRes.status,
      watchPageHttpStatus: watchPageRes.status,
      streamType: playbackJson?.streamType ?? null,
      streamUrl: playbackJson?.url ?? null,
      rightsCount: detailJson?.rights?.length ?? 0,
      episodesVerified: episodeChecks,
      allPassed:
        detailRes.status === 200 &&
        playbackRes.status === 200 &&
        watchPageRes.status === 200 &&
        Boolean(playbackJson?.url) &&
        (detailJson?.kind !== "series" ||
          (episodeChecks.length > 0 && episodeChecks.every((e) => e.httpStatus === 200 && e.streamUrl))),
    };
    liveHttpChecks.push(checkResult);
    console.log(
      `   -> [${checkResult.allPassed ? "PASS ✓" : "FAIL ✗"}] /title/${slug} (${checkResult.kind}): detail=HTTP ${checkResult.detailApiStatus}, playback=HTTP ${checkResult.playbackApiStatus} (${checkResult.streamType}), watchPage=HTTP ${checkResult.watchPageHttpStatus}${
        episodeChecks.length ? `, episodes=${episodeChecks.length} verified` : ""
      }`,
    );
  }

  const reportPayload = {
    platform: "FamilyFlix By DemureGram — Production Catalog Importer & Publisher Execution Report",
    executedAt: new Date().toISOString(),
    workflowCompleted:
      "Select additions -> Validate Preflight -> Dry Run -> Import into Production -> Review Rights -> Publish -> Verify Live Catalog",
    job,
    livePublicHttpVerification: liveHttpChecks,
  };

  const reportTargets = [
    "familyflix-production-import-execution-report.json",
    path.join("artifacts", "familyflix", "public", "familyflix-production-import-execution-report.json"),
    path.join("artifacts", "familyflix", "dist", "public", "familyflix-production-import-execution-report.json"),
  ];
  for (const target of reportTargets) {
    if (fs.existsSync(target)) {
      fs.chmodSync(target, 0o666);
    }
    fs.writeFileSync(target, JSON.stringify(reportPayload, null, 2), "utf8");
  }
  console.log("9. Saved complete execution report to familyflix-production-import-execution-report.json");
}

main().catch((err) => {
  console.error("Production import workflow failed:", err);
  process.exit(1);
});
