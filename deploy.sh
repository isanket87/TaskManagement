#!/bin/bash

# Brioright — Zero-downtime deployment script
# Run from LOCAL machine: bash deploy.sh
# Requires: ssh alias 'myserver' configured in ~/.ssh/config

set -e  # Exit on any error

SERVER_USER="root"
SERVER_IP="185.167.99.233"
APP_DIR="/var/www/brioright"
REPO_URL="https://github.com/isanket87/TaskManagement.git"
BRANCH="main"

echo "🚀 Starting Brioright deployment..."
echo "📡 Server: $SERVER_IP"
echo ""

ssh myserver << 'ENDSSH'
  set -e

  APP_DIR="/var/www/brioright"

  if [ ! -d "$APP_DIR" ]; then
    echo "❌ App directory not found. Run the initial setup first."
    exit 1
  fi

  echo "📥 Pulling latest code from GitHub..."
  cd "$APP_DIR"
  git pull origin main

  echo "📦 Installing server dependencies..."
  cd server
  npm ci --omit=dev
  npx prisma generate
  npx prisma migrate deploy

  echo "📦 Installing client dependencies + building..."
  cd ../client
  npm ci
  npm run build

  echo "📁 Syncing React build to server public folder..."
  mkdir -p ../server/public
  rsync -a --delete dist/ ../server/public/

  echo "♻️  Reloading app with zero downtime..."
  cd ..
  pm2 reload ecosystem.config.cjs --env production --update-env
  pm2 save

  echo ""
  echo "✅ Deployment complete!"
  pm2 list
ENDSSH

echo ""
echo "🎉 Brioright deployed successfully!"
echo "🌐 Live at: http://$SERVER_IP"
