#!/bin/bash

# Brioright — Initial Server Setup Script
# Run this ONCE on a fresh Ubuntu/Debian server via SSH
# Usage: bash server-setup.sh

set -e

echo "======================================"
echo "  Brioright Server Setup"
echo "======================================"
echo ""

# 1. Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# 2. Install Node.js 20
echo "⬢ Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "   Node: $(node --version)"
echo "   NPM:  $(npm --version)"

# 3. Install PM2
echo "🔄 Installing PM2..."
npm install -g pm2
echo "   PM2: $(pm2 --version)"

# 4. Install Nginx
echo "🌐 Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
echo "   Nginx: $(nginx -v 2>&1)"

# 5. Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# 6. Create database and user
echo "🗄️  Creating Brioright database..."
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
sudo -u postgres psql -c "CREATE USER brioright WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
  echo "   User 'brioright' already exists"
sudo -u postgres psql -c "CREATE DATABASE brioright OWNER brioright;" 2>/dev/null || \
  echo "   Database 'brioright' already exists"

echo ""
echo "   ✅ Database ready!"
echo "   DB User:     brioright"
echo "   DB Password: $DB_PASS"
echo "   DB Name:     brioright"
echo ""

# 7. Generate secrets
echo "🔑 Generating secure secrets..."
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
echo "   JWT secrets generated ✅"

# 8. Set up app directory
echo "📁 Setting up app directory..."
mkdir -p /var/www/brioright
mkdir -p /var/log/brioright

# 9. Clone the repo
echo "📥 Cloning Brioright repository..."
if [ -d "/var/www/brioright/.git" ]; then
  echo "   Repo already exists, pulling latest..."
  cd /var/www/brioright && git pull origin main
else
  git clone https://github.com/isanket87/TaskManagement.git /var/www/brioright
fi

# 10. Write .env.production with auto-generated values
ENV_FILE="/var/www/brioright/server/.env.production"
echo "📝 Writing $ENV_FILE..."
cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=5000

# Database (auto-generated)
DATABASE_URL="postgresql://brioright:${DB_PASS}@localhost:5432/brioright"

# Auth secrets (auto-generated — do NOT change unless you want all sessions to expire)
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"

# Frontend URL — update to your domain once you have one
CLIENT_URL="http://185.167.99.233"

# ── YOU MUST FILL THESE IN ──────────────────────────
RESEND_API_KEY="re_CHANGE_ME"
EMAIL_FROM="Brioright <noreply@brioright.app>"

GOOGLE_CLIENT_ID="CHANGE_ME"
GOOGLE_CLIENT_SECRET="CHANGE_ME"
GOOGLE_CALLBACK_URL="http://185.167.99.233/api/auth/google/callback"
# ────────────────────────────────────────────────────

# File storage — optional
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
EOF
chmod 600 "$ENV_FILE"
echo "   .env.production written ✅"

# 11. Set up Nginx config
echo "🌐 Configuring Nginx..."
cp /var/www/brioright/nginx.brioright.conf /etc/nginx/sites-available/brioright
ln -sf /etc/nginx/sites-available/brioright /etc/nginx/sites-enabled/brioright
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 12. Firewall rules
echo "🔒 Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'

echo ""
echo "======================================"
echo "  ✅ Server setup complete!"
echo "======================================"
echo ""
echo "Auto-generated values (already saved to .env.production):"
echo "  DB Password:       $DB_PASS"
echo "  JWT_SECRET:        (64-byte hex — stored in .env.production)"
echo "  JWT_REFRESH_SECRET:(64-byte hex — stored in .env.production)"
echo ""
echo "ACTION REQUIRED — edit .env.production and fill in:"
echo "  nano /var/www/brioright/server/.env.production"
echo ""
echo "  RESEND_API_KEY       → your Resend API key"
echo "  GOOGLE_CLIENT_ID     → from Google Cloud Console"
echo "  GOOGLE_CLIENT_SECRET → from Google Cloud Console"
echo ""
echo "Then run the app:"
echo "  cd /var/www/brioright/server"
echo "  npm ci --omit=dev && npx prisma generate && npx prisma migrate deploy"
echo "  cd ../client && npm ci && npm run build"
echo "  mkdir -p ../server/public && cp -r dist/* ../server/public/"
echo "  cd .. && pm2 start ecosystem.config.cjs --env production"
echo "  pm2 save && pm2 startup"
echo ""
echo "  Visit: http://185.167.99.233 🚀"

