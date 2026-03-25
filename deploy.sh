#!/bin/bash

# Exit on any error
set -e

# Configuration
APP_DIR="/var/www/brioright"
BRANCH="main"

echo "🚀 Starting robust deployment to $BRANCH..."

# 🛡️ Ensure directory exists and has correct permissions
if [ ! -d "$APP_DIR" ]; then
  echo "❌ Error: $APP_DIR does not exist. Please run server-setup.sh first."
  exit 1
fi

echo "🛡️ Fixing folder permissions..."
sudo chown -R $USER:$USER $APP_DIR
sudo chmod -R 755 $APP_DIR

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

# Install dependencies
npm install --omit=dev

# Prisma operations
echo "💎 Running Prisma migrations..."
npx prisma generate
npx prisma migrate deploy

# ----- Client Setup -----
echo "📦 Setting up Client..."
cd "$APP_DIR/client"

# Ensure clean state
rm -rf dist
npm install

# Create a clean .env.production for the Vite build
echo "📝 Generating .env.production for Vite..."
echo "# Auto-generated during deploy" > .env.production

# 1. Pull VITE_ variables from the server's .env.production (if exists)
if [ -f "$APP_DIR/server/.env.production" ]; then
  grep '^VITE_' "$APP_DIR/server/.env.production" >> .env.production || true
fi

# 2. Pull from a PERSISTENT shared file (REQUIRED for your manual keys)
if [ -f "$APP_DIR/.env.shared" ]; then
  echo "📄 Merging persistent variables from .env.shared..."
  cat "$APP_DIR/.env.shared" >> .env.production || true
fi

# 3. Pull from GitHub environment variables
if [ ! -z "$VITE_GA_TRACKING_ID" ]; then
  echo "VITE_GA_TRACKING_ID=$VITE_GA_TRACKING_ID" >> .env.production
  echo "📄 Injected VITE_GA_TRACKING_ID from GitHub."
fi

# Clean up any potential Windows line endings
sed -i 's/\r//' .env.production
echo "✅ .env.production ready for build."

# Build the client
echo "🏗️  Building client..."
npm run build -- --mode production
rm .env.production

# ----- Sync Client Build -----
echo "📂 Updating public assets..."
# Use sudo only for the mkdir/rm/cp to ensure we can write to the server's public folder
sudo mkdir -p "$APP_DIR/server/public"
sudo rm -rf "$APP_DIR/server/public/*"
sudo cp -r "$APP_DIR/client/dist/"* "$APP_DIR/server/public/"
sudo chown -R $USER:$USER "$APP_DIR/server/public"

# ----- Clean Port 5000 (Prevent EADDRINUSE) -----
echo "🧹 Cleaning up port 5000..."
sudo fuser -k 5000/tcp || true

# ----- Restart App via PM2 -----
echo "🔄 Restarting PM2 process..."
cd "$APP_DIR/server"
# Check if the process is already running
if pm2 list | grep -q "brioright-api"; then
    pm2 restart ecosystem.config.cjs --env production --update-env
else
    pm2 start ecosystem.config.cjs --env production --update-env
fi

# Save PM2 state
pm2 save

echo "✅ Deployment finished successfully!"
