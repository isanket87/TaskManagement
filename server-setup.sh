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
echo "   DB Password: $DB_PASS   ← SAVE THIS!"
echo "   DB Name:     brioright"
echo ""

# 7. Set up app directory
echo "📁 Setting up app directory..."
mkdir -p /var/www/brioright
mkdir -p /var/log/brioright

# 8. Clone the repo
echo "📥 Cloning Brioright repository..."
if [ -d "/var/www/brioright/.git" ]; then
  echo "   Repo already exists, pulling latest..."
  cd /var/www/brioright && git pull origin main
else
  git clone https://github.com/isanket87/TaskManagement.git /var/www/brioright
fi

# 9. Set up Nginx config
echo "🌐 Configuring Nginx..."
cp /var/www/brioright/nginx.brioright.conf /etc/nginx/sites-available/brioright
ln -sf /etc/nginx/sites-available/brioright /etc/nginx/sites-enabled/brioright
rm -f /etc/nginx/sites-enabled/default  # Remove default site
nginx -t && systemctl reload nginx

# 10. Firewall rules
echo "🔒 Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'

echo ""
echo "======================================"
echo "  ✅ Server setup complete!"
echo "======================================"
echo ""
echo "NEXT STEPS:"
echo "1. Create /var/www/brioright/server/.env.production"
echo "   Use: cp /var/www/brioright/server/.env.production.example /var/www/brioright/server/.env.production"
echo "   Then edit it: nano /var/www/brioright/server/.env.production"
echo "   (Set DATABASE_URL with password: $DB_PASS)"
echo ""
echo "2. Install deps + migrate + build:"
echo "   cd /var/www/brioright/server && npm ci --omit=dev && npx prisma generate && npx prisma migrate deploy"
echo "   cd ../client && npm ci && npm run build"
echo "   mkdir -p ../server/public && cp -r dist/* ../server/public/"
echo ""
echo "3. Start the app:"
echo "   cd /var/www/brioright && pm2 start ecosystem.config.cjs --env production && pm2 save"
echo "   pm2 startup  ← and run the printed command"
echo ""
echo "4. Visit: http://185.167.99.233"
