#!/usr/bin/env bash
# FamilyFlix By DemureGram - DNSSEC Key Generation & Zone Signing
set -euo pipefail

ZONE_DIR="/etc/bind/zones"
ZONE_NAME="officialfamilyflix.com"
ZONE_FILE="${ZONE_DIR}/${ZONE_NAME}.zone"

echo "=== [Step 1] Navigating to DNSSEC Directory ==="
cd "${ZONE_DIR}"

echo "=== [Step 2] Generating Zone Signing Key (ZSK) ==="
# Algorithm 13 = ECDSA Curve P-256 with SHA-256 (modern, fast, lightweight)
ZSK=$(dnssec-keygen -a ECDSAP256SHA256 -n ZONE "${ZONE_NAME}")
echo "ZSK Generated: ${ZSK}"

echo "=== [Step 3] Generating Key Signing Key (KSK) ==="
KSK=$(dnssec-keygen -f KSK -a ECDSAP256SHA256 -n ZONE "${ZONE_NAME}")
echo "KSK Generated: ${KSK}"

echo "=== [Step 4] Including Keys in Zone File ==="
# Append key includes if not already present
grep -q "${ZSK}.key" "${ZONE_FILE}" || echo "\$INCLUDE ${ZONE_DIR}/${ZSK}.key" >> "${ZONE_FILE}"
grep -q "${KSK}.key" "${ZONE_FILE}" || echo "\$INCLUDE ${ZONE_DIR}/${KSK}.key" >> "${ZONE_FILE}"

echo "=== [Step 5] Signing the Zone ==="
dnssec-signzone -A -3 $(head -c 16 /dev/urandom | sha1sum | cut -b 1-16) \
  -N INCREMENT -o "${ZONE_NAME}" -t "${ZONE_FILE}"

echo "=== [Step 6] Generating DS (Delegation Signer) Record for Registrar ==="
echo "=========================================================================="
echo "ACTION REQUIRED AT DOMAIN REGISTRAR (Porkbun, Namecheap, Cloudflare, etc.):"
echo "Add the following DS Record under DNSSEC Settings:"
echo "--------------------------------------------------------------------------"
dnssec-dsfromkey "${KSK}.key"
echo "=========================================================================="

echo "=== [Step 7] Reloading BIND9 Nameserver ==="
systemctl reload named || rndc reload
echo "DNSSEC Setup Completed Successfully!"
