#!/bin/bash

# Configuration
APP_DIR="/var/www/brioright"
BRANCH="main"

echo "Starting deployment..."

# Navigate to app directory
cd $APP_DIR || exit

# Pull latest code
echo "Pulling latest code from $BRANCH..."
git fetch
git reset --hard origin/$BRANCH

# ----- Server Setup -----
echo "Setting up Server..."
cd $APP_DIR/server
npm install
npm run build # Generates Prisma Client
npm run migrate:prod # Runs database migrations

# ----- Client Setup -----
echo "Setting up Client..."
cd $APP_DIR/client
npm install
npm run build

# ----- Restart App via PM2 -----
echo "Restarting PM2 process..."
cd $APP_DIR/server
pm2 restart ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production

echo "Deployment finished successfully!"
