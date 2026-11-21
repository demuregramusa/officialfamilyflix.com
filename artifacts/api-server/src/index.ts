import app from "./app";
import { logger } from "./lib/logger";
import { recoverInterruptedArchiveJobs } from "./lib/movie-archive-import";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const archiveRecoveryEnabled =
  process.env.FAMILYFLIX_ENABLE_ARCHIVE_RECOVERY === "true";

const startServer = async () => {
  if (archiveRecoveryEnabled) {
    await recoverInterruptedArchiveJobs();
    logger.info("Interrupted archive import recovery completed");
  } else {
    logger.info(
      "Archive recovery skipped; set FAMILYFLIX_ENABLE_ARCHIVE_RECOVERY=true to enable it",
    );
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
};

void startServer().catch((err: unknown) => {
  logger.error({ err }, "Could not start API server");
  process.exit(1);
});
