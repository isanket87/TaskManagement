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

# 📝 Prepare clean .env.production
echo "📝 Preparing clean .env.production..."
# Start with a clean copy or fresh file
if [ -f ".env.production.example" ]; then
  cp .env.production.example .env.production
else
  touch .env.production
fi

# 📄 Function to safely update/add variables to .env
update_env() {
  local key=$(echo "$1" | tr -d '\r' | xargs)
  local value=$(echo "$2" | tr -d '\r' | xargs)
  if [[ -z "$value" ]] || [[ "$value" == "null" ]] || [[ "$value" == "CHANGE_ME" ]]; then
    return
  fi
  # Remove existing entry if it exists
  sed -i "/^$key=/d" .env.production
  # Append the new value
  echo "$key=$value" >> .env.production
}

# 1. Merge from server's .env.production (if exists)
if [ -f "$APP_DIR/server/.env.production" ]; then
  echo "📄 Merging VITE_ overrides from server/.env.production..."
  while IFS='=' read -r key value || [ -n "$key" ]; do
    if [[ $key =~ ^VITE_ ]]; then
      update_env "$key" "$value"
    fi
  done < "$APP_DIR/server/.env.production"
fi

# 2. Merge from persistent .env.shared (HIGH PRIORITY)
if [ -f "$APP_DIR/.env.shared" ]; then
  echo "📄 Merging persistent variables from .env.shared..."
  while IFS='=' read -r key value || [ -n "$key" ]; do
    update_env "$key" "$value"
  done < "$APP_DIR/.env.shared"
fi

# 3. Inject from system environment (starts with G-)
if [[ $VITE_GA_TRACKING_ID =~ ^G- ]]; then
  update_env "VITE_GA_TRACKING_ID" "$VITE_GA_TRACKING_ID"
  echo "📄 Injected VITE_GA_TRACKING_ID from system environment."
fi

# Clean up line endings
sed -i 's/\r//' .env.production
echo "✅ .env.production cleaned and ready."

# 🏗️  Building client
echo "🏗️  Preparing Atomic Local Injection for build..."
if sudo [ -f "$APP_DIR/.env.production" ]; then
  # 🔐 PRIVILEGED EXTRACTION: Multi-variable extraction
  # Extract ALL variables starting with VITE_ and create the .local file
  sudo grep '^VITE_' "$APP_DIR/.env.production" | tr -d '\r' > "$APP_DIR/client/.env.production.local"
  echo "✅ Ephemeral .env.production.local created with ALL VITE_ variables."
else
  echo "⚠️  WARNING: .env.production not found or inaccessible."
fi

# Deep Cache and Artifact Cleanup
rm -rf "$APP_DIR/client/dist"
rm -rf "$APP_DIR/client/node_modules/.vite"

# Build the client
echo "🏗️  Building client..."
cd "$APP_DIR/client" && npm run build -- --mode production && cd "$APP_DIR"

# Remove epoxy env file after build
rm -f "$APP_DIR/client/.env.production.local"

# 🛡️  Post-Build Bundle Integrity Check
echo "🛡️  Checking if Production IDs were successfully bundled..."
# Extract values the same way Vite does to verify the bundle
GA_ID=$(sudo grep 'VITE_GA_TRACKING_ID' "$APP_DIR/.env.production" | cut -d'=' -f2 | tr -d '"\r' | xargs)
GOOGLE_ID=$(sudo grep 'VITE_GOOGLE_CLIENT_ID' "$APP_DIR/.env.production" | cut -d'=' -f2 | tr -d '"\r' | xargs)

echo "🔍 Verifying GA_ID: $GA_ID"
echo "🔍 Verifying GOOGLE_ID: $GOOGLE_ID"

if grep -q "$GA_ID" "$APP_DIR/client/dist/assets/index-*.js" && grep -q "$GOOGLE_ID" "$APP_DIR/client/dist/assets/index-*.js"; then
  echo "✅ INTEGRITY SUCCESS: All Production IDs found in the new build bundle."
else
  echo "❌ INTEGRITY FAILURE: Critical IDs are MISSING from the bundle after build!"
  exit 1
fi

# 🛡️  Bundle Integrity Check
echo "🛡️  Performing Bundle Integrity Check..."
if grep -q "G-P5NHCX77XB" dist/assets/index-*.js; then
  echo "✅ INTEGRITY PASSED: Tracking ID exists in the new bundle."
else
  echo "❌ INTEGRITY FAILED: Tracking ID is missing from the new bundle!"
  echo "Deployment aborted to protect production integrity."
  exit 1
fi

# ----- Sync Client Build (Mirror Sync) -----
echo "🔄 Mirroring client build to server public folder..."
# Use rsync --delete to ensure the public folder is a perfect, clean replica of dist
sudo rsync -avz --delete "$APP_DIR/client/dist/" "$APP_DIR/server/public/"
echo "✅ Client build mirrored successfully."
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
