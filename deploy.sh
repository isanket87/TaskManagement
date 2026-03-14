#!/bin/bash

# Configuration
APP_DIR="/var/www/brioright"
BRANCH="main"

echo "🚀 Starting deployment to $BRANCH..."

# Navigate to app directory
cd $APP_DIR || exit

# Pull latest code
echo "📥 Pulling latest code..."
git fetch
git reset --hard origin/$BRANCH

# ----- Server Setup -----
echo "⚙️  Setting up Server..."
cd $APP_DIR/server
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy

# ----- Client Setup -----
echo "📦 Setting up Client..."
cd $APP_DIR/client
npm install

# Create a clean .env.production for the Vite build by pulling VITE_ vars from the server config
echo "# Auto-generated from server/.env.production during deploy" > .env.production
if [ -f "$APP_DIR/server/.env.production" ]; then
  echo "📄 Injecting VITE_ variables into client build..."
  grep '^VITE_' "$APP_DIR/server/.env.production" >> .env.production
else
  echo "⚠️  Warning: $APP_DIR/server/.env.production not found. Analytics might be missing."
fi

npm run build
rm .env.production # Clean up after build

# ----- Sync Client Build to Server Public -----
echo "📂 Updating public assets..."
sudo mkdir -p $APP_DIR/server/public
sudo rm -rf $APP_DIR/server/public/*
sudo cp -r $APP_DIR/client/dist/* $APP_DIR/server/public/

# ----- Restart App via PM2 -----
echo "🔄 Restarting PM2 process..."
cd $APP_DIR/server
pm2 restart ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production

echo "✅ Deployment finished successfully!"
