#!/usr/bin/env bash
# ec2-bootstrap.sh
# Run ONCE on a fresh EC2 instance (Ubuntu 22.04 / 24.04) as the ubuntu user.
# Usage: chmod +x ec2-bootstrap.sh && sudo ./ec2-bootstrap.sh

set -euo pipefail

EC2_USER="${1:-ubuntu}"           # pass a different user if needed
APP_DIR="/opt/aurum"
AURUM_REPO="git@github.com:YOUR_ORG/aurum.git"
BACK_AURUM_REPO="git@github.com:YOUR_ORG/back-aurum.git"

echo "══════════════════════════════════════════"
echo "  Aurum EC2 bootstrap"
echo "══════════════════════════════════════════"

# ── 1. System packages ────────────────────────
apt-get update -y
apt-get install -y curl git ca-certificates gnupg lsb-release

# ── 2. Docker ─────────────────────────────────
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker
usermod -aG docker "$EC2_USER"

echo "Docker $(docker --version) installed ✓"

# ── 3. Clone repos ────────────────────────────
mkdir -p "$APP_DIR"
chown "$EC2_USER":"$EC2_USER" "$APP_DIR"

# Switch to app user for git ops
sudo -u "$EC2_USER" bash -c "
  cd $APP_DIR
  git clone $AURUM_REPO aurum
  git clone $BACK_AURUM_REPO back-aurum
"

# ── 4. Copy compose + nginx ───────────────────
cp "$APP_DIR/aurum/docker/docker-compose.prod.yml" "$APP_DIR/docker-compose.prod.yml"
mkdir -p "$APP_DIR/nginx/certs"
cp "$APP_DIR/aurum/nginx/nginx.conf"               "$APP_DIR/nginx/nginx.conf"

# ── 5. Create .env from template ──────────────
cat > "$APP_DIR/.env" <<'ENV'
# !! Fill in real values before starting !!
DATABASE_URL=postgresql://USER:PASSWORD@db.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=CHANGE_ME_USE_OPENSSL_RAND_BASE64_32
JWT_EXPIRES_IN=7d
VITE_API_URL=https://YOUR_DOMAIN/api
ENV

chown "$EC2_USER":"$EC2_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

echo ""
echo "══════════════════════════════════════════"
echo "  Bootstrap complete ✓"
echo ""
echo "  Next steps:"
echo "  1. Edit $APP_DIR/.env with real secrets"
echo "  2. Add SSL certs to $APP_DIR/nginx/certs/"
echo "     (fullchain.pem + privkey.pem)"
echo "  3. cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --build"
echo "══════════════════════════════════════════"
