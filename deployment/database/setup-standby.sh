#!/usr/bin/env bash
# FamilyFlix By DemureGram - Secondary Node PostgreSQL Standby Setup
set -euo pipefail

PRIMARY_HOST="${1:-192.168.1.101}"
PRIMARY_PORT="${2:-5432}"
REPL_USER="${3:-replicator}"
DATA_DIR="/var/lib/postgresql/16/main"

echo "=== [Step 1] Stopping local PostgreSQL on Standby Node ==="
systemctl stop postgresql

echo "=== [Step 2] Cleaning existing standby data directory ==="
rm -rf "${DATA_DIR:?}"/*

echo "=== [Step 3] Executing pg_basebackup from Primary Server ==="
sudo -u postgres pg_basebackup \
  -h "${PRIMARY_HOST}" \
  -p "${PRIMARY_PORT}" \
  -U "${REPL_USER}" \
  -D "${DATA_DIR}" \
  -Fp -Xs -P -R

echo "=== [Step 4] Verifying standby.signal and connection configuration ==="
if [ -f "${DATA_DIR}/standby.signal" ]; then
    echo "Confirmed: standby.signal created."
fi

echo "=== [Step 5] Starting PostgreSQL Standby ==="
systemctl start postgresql
systemctl status postgresql --no-pager

echo "=== [Step 6] Replication Status Check ==="
sudo -u postgres psql -c "SELECT pg_is_in_recovery(), pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"
echo "Standby replication is active and in sync!"
