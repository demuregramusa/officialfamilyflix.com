#!/usr/bin/env bash
# ==============================================================================
# FAMILYFLIX BY DEMUREGRAM — COMPLETE PRODUCTION SERVER PROVISIONING SCRIPT
# OS Target: Ubuntu Server 24.04 LTS (x86_64)
# ==============================================================================
set -euo pipefail

echo "=========================================================================="
echo "    FAMILYFLIX BY DEMUREGRAM - SELF-HOSTED PRODUCTION DEPLOYMENT"
echo "=========================================================================="

APP_DIR="/var/www/familyflix"
MEDIA_DIR="/var/media/familyflix"
BACKUP_DIR="/var/backups/familyflix"

# 1. System Packages
echo "--> Installing core server packages..."
apt-get update -y
apt-get install -y \
    curl git build-essential ufw fail2ban \
    bind9 bind9utils bind9-doc dnsutils \
    nginx certbot python3-certbot-nginx \
    postgresql-16 postgresql-contrib-16 \
    ffmpeg jq htop nut

# 2. Node.js LTS (v20 or v22)
if ! command -v node &> /dev/null; then
    echo "--> Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# 3. Create Service User & Directories
echo "--> Setting up service users and file permissions..."
id -u familyflix &>/dev/null || useradd -r -m -s /bin/bash familyflix

mkdir -p "${APP_DIR}" \
         "${MEDIA_DIR}/hls" \
         "${MEDIA_DIR}/images" \
         "${BACKUP_DIR}/postgres" \
         /var/log/familyflix \
         /etc/familyflix

chown -R familyflix:familyflix "${APP_DIR}" "${MEDIA_DIR}" "${BACKUP_DIR}" /var/log/familyflix /etc/familyflix

# 4. Copy Services & Configurations
echo "--> Installing Systemd units & NGINX configs..."
cp deployment/systemd/*.service /etc/systemd/system/
systemctl daemon-reload

cp deployment/nginx/nginx.conf /etc/nginx/nginx.conf
cp deployment/nginx/conf.d/*.conf /etc/nginx/conf.d/
nginx -t

# 5. Database Setup
echo "--> Configuring PostgreSQL database & permissions..."
sudo -u postgres psql -c "CREATE USER familyflix WITH ENCRYPTED PASSWORD 'replace_with_strong_password';" || true
sudo -u postgres psql -c "CREATE DATABASE familyflix OWNER familyflix;" || true
sudo -u postgres psql -d familyflix -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" || true

# 6. Authoritative BIND DNS Setup
echo "--> Configuring BIND9 DNS Zones..."
mkdir -p /etc/bind/zones
cp deployment/dns/officialfamilyflix.com.zone /etc/bind/zones/
cat deployment/dns/named.conf.local >> /etc/bind/named.conf.local
named-checkconf
named-checkzone officialfamilyflix.com /etc/bind/zones/officialfamilyflix.com.zone

echo "=========================================================================="
echo "    PROVISIONING COMPLETE!"
echo "    Next steps:"
echo "    1. Populate /etc/familyflix/.env"
echo "    2. Restore database: pg_restore -d familyflix backups/familyflix_pre_migration.dump"
echo "    3. Issue SSL: certbot --nginx -d officialfamilyflix.com -d *.officialfamilyflix.com"
echo "    4. Enable services: systemctl enable --now familyflix-api nginx named"
echo "=========================================================================="
