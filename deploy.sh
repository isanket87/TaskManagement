#!/bin/bash

# Exit on any error
set -e

# Configuration
APP_DIR="/var/www/brioright"
BRANCH="main"

echo "🚀 Starting deployment to $BRANCH..."

# Navigate to app directory
cd $APP_DIR

# 📥 Pull latest code
echo "📥 Fetching latest code..."
git fetch origin $BRANCH
echo "📥 Resetting to origin/$BRANCH..."
git reset --hard origin/$BRANCH

# ----- Server Setup -----
echo "⚙️  Setting up Server..."
cd "$APP_DIR/server"
npm install --omit=dev
npx prisma generate
npx prisma migrate deploy

# ----- Client Setup -----
echo "📦 Setting up Client..."
cd "$APP_DIR/client"

# Ensure clean state - use sudo if necessary but better to own the dir
rm -rf dist
npm install

# Create a clean .env.production for the Vite build
echo "📝 Generating .env.production for Vite..."
echo "# Auto-generated during deploy" > .env.production

# 1. Pull VITE_ variables from the server's .env.production
if [ -f "$APP_DIR/server/.env.production" ]; then
  grep '^VITE_' "$APP_DIR/server/.env.production" >> .env.production || true
fi

# 2. Pull from a PERSISTENT shared file (this stays on the server forever)
if [ -f "$APP_DIR/.env.shared" ]; then
  echo "📄 Merging persistent variables from .env.shared..."
  grep '^VITE_' "$APP_DIR/.env.shared" >> .env.production || true
fi

# 3. Pull from GitHub environment variables (if any)
if [ ! -z "$VITE_GA_TRACKING_ID" ]; then
  if grep -q "VITE_GA_TRACKING_ID=" .env.production; then
    sed -i "s/VITE_GA_TRACKING_ID=.*/VITE_GA_TRACKING_ID=$VITE_GA_TRACKING_ID/" .env.production
  else
    echo "VITE_GA_TRACKING_ID=$VITE_GA_TRACKING_ID" >> .env.production
  fi
  echo "📄 Injected VITE_GA_TRACKING_ID from GitHub."
fi

# Clean up any potential Windows line endings (\r) that break Vite
sed -i 's/\r//' .env.production
echo "✅ .env.production ready for build."

# Build the client
echo "🏗️  Building client..."
npm run build -- --mode production
rm .env.production

# ----- Sync Client Build -----
# The server is configured to serve from client/dist, so we ensure it's accessible
# We also sync to server/public as a backup/legacy location
echo "📂 Updating public assets..."
sudo mkdir -p "$APP_DIR/server/public"
sudo rm -rf "$APP_DIR/server/public/*"
sudo cp -r "$APP_DIR/client/dist/"* "$APP_DIR/server/public/"

# ----- Restart App via PM2 -----
echo "🔄 Restarting PM2 process..."
cd "$APP_DIR/server"
# Use 'reload' for zero-downtime if possible, or 'restart'
pm2 restart ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production

echo "✅ Deployment finished successfully!"
