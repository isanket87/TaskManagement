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

# Create a temporary .env.production for the Vite build if needed, 
# but since we now track client/.env.production in Git, we should build upon it.
echo "📝 Preparing .env.production for Vite build..."

# If .env.production doesn't exist (e.g. first run), create it
if [ ! -f ".env.production" ]; then
  touch .env.production
fi

# 1. Pull VITE_ variables from the server's .env.production (if exists)
# We use a temporary file to avoid polluting the tracked .env.production too much,
# or we just append and let git reset handle the cleanup later.
if [ -f "$APP_DIR/server/.env.production" ]; then
  echo "📄 Merging VITE_ overrides from server/.env.production..."
  # Only append variables that aren't already in the file with a real value
  while IFS= read -r line; do
    if [[ $line =~ ^VITE_ ]]; then
      key=$(echo $line | cut -d'=' -f1)
      value=$(echo $line | cut -d'=' -f2-)
      # If the value is "CHANGE_ME" or empty, skip it to prefer the one in Git
      if [[ "$value" == "\"CHANGE_ME\"" ]] || [[ "$value" == "CHANGE_ME" ]] || [[ -z "$value" ]]; then
        continue
      fi
      # Remove existing entry if it exists and append new one
      sed -i "/^$key=/d" .env.production
      echo "$line" >> .env.production
    fi
  done < "$APP_DIR/server/.env.production"
fi

# 2. Pull from a PERSISTENT shared file (REQUIRED for your manual keys)
if [ -f "$APP_DIR/.env.shared" ]; then
  echo "📄 Merging persistent variables from .env.shared..."
  cat "$APP_DIR/.env.shared" >> .env.production || true
fi

# 3. Pull from system environment (GitHub/Shell) - ONLY IF NOT EMPTY
if [ ! -z "$VITE_GA_TRACKING_ID" ] && [ "$VITE_GA_TRACKING_ID" != "null" ]; then
  sed -i '/VITE_GA_TRACKING_ID/d' .env.production
  echo "VITE_GA_TRACKING_ID=$VITE_GA_TRACKING_ID" >> .env.production
  echo "📄 Injected VITE_GA_TRACKING_ID from system environment."
fi

# Clean up any potential Windows line endings
sed -i 's/\r//' .env.production
echo "✅ .env.production ready for build. Contents (VITE_ only):"
grep '^VITE_' .env.production || echo "None found"

# Build the client
echo "🏗️  Building client..."
npm run build -- --mode production

# ----- Sync Client Build -----
echo "📂 Updating public assets..."
# Delete and recreate to be 100% sure no old files remain
sudo rm -rf "$APP_DIR/server/public/assets"
sudo mkdir -p "$APP_DIR/server/public/assets"
sudo rm -f "$APP_DIR/server/public/index.html"
sudo rm -f "$APP_DIR/server/public/registerSW.js"
sudo rm -f "$APP_DIR/server/public/sw.js"
sudo rm -f "$APP_DIR/server/public/manifest.webmanifest"

# Copy new files
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
