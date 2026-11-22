#!/usr/bin/env bash
# FamilyFlix By DemureGram - Automated Daily Database Backup & Verification
set -euo pipefail

BACKUP_DIR="/var/backups/familyflix/postgres"
RETENTION_DAYS=14
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/familyflix_${TIMESTAMP}.dump"
SCHEMA_FILE="${BACKUP_DIR}/familyflix_${TIMESTAMP}_schema.sql"
LOG_FILE="/var/log/familyflix/backup.log"

mkdir -p "${BACKUP_DIR}" /var/log/familyflix

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting database backup for familyflix..."

# 1. Custom compressed binary dump (fast, includes BLOBs and TOC)
pg_dump -U postgres -d familyflix -F c -b -v -f "${BACKUP_FILE}" 2>> "${LOG_FILE}"
log "Binary dump created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# 2. Plain-text schema dump for audit and git diffing
pg_dump -U postgres -d familyflix -F p --schema-only -f "${SCHEMA_FILE}" 2>> "${LOG_FILE}"

# 3. Generate SHA-256 Checksum for verification
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

# 4. Verify dump TOC integrity
if pg_restore -l "${BACKUP_FILE}" > /dev/null 2>&1; then
    log "Backup TOC integrity test: PASSED."
else
    log "ERROR: Backup integrity test FAILED!"
    exit 1
fi

# 5. Clean up archives older than RETENTION_DAYS
find "${BACKUP_DIR}" -type f -name "familyflix_*.dump*" -mtime "+${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -type f -name "familyflix_*_schema.sql" -mtime "+${RETENTION_DAYS}" -delete

log "Daily backup cycle completed successfully."
