#!/usr/bin/env bash
# FamilyFlix By DemureGram - Production UFW Firewall Hardening
set -euo pipefail

SECONDARY_NODE_IP="${1:-192.168.1.102}"

echo "=== Configuring UFW Defaults ==="
ufw default deny incoming
ufw default allow outgoing

echo "=== Allowing Essential Public Services ==="
# SSH with connection rate limiting
ufw limit 22/tcp comment 'SSH Rate Limited'

# Web Traffic
ufw allow 80/tcp comment 'HTTP ACME & Redirects'
ufw allow 443/tcp comment 'HTTPS Production Traffic'

# Authoritative DNS (TCP & UDP)
ufw allow 53/tcp comment 'Authoritative DNS TCP'
ufw allow 53/udp comment 'Authoritative DNS UDP'

echo "=== Allowing Inter-Node Private Services ==="
# PostgreSQL replication ONLY from secondary server
ufw allow from "${SECONDARY_NODE_IP}" to any port 5432 proto tcp comment 'PostgreSQL Replication'

echo "=== Enabling UFW ==="
ufw --force enable
ufw status verbose
