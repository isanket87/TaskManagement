#!/bin/bash

# TaskFlow — Zero-downtime deployment script
# Run this on your LOCAL machine to deploy to Kamatera
# Usage: ./deploy.sh

set -e  # Exit on any error

SERVER_IP="185.167.99.233"       # Replace with your Kamatera IP
SERVER_USER="root"           # Deploy user (not root)
APP_DIR="/var/www/taskflow"
REPO_URL="https://github.com/isanket87/TaskManagement.git"

echo "🚀 Starting TaskFlow deployment..."
echo "📡 Server: $SERVER_IP"
echo ""

# SSH into server and run deployment
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
  set -e
  
  echo "📥 Pulling latest code..."
  cd /var/www/taskflow
  git pull origin main
  
  echo "📦 Installing server dependencies..."
  cd server
  npm ci --production
  
  echo "🔄 Running database migrations..."
  npx prisma migrate deploy
  npx prisma generate
  
  echo "📦 Installing client dependencies..."
  cd ../client
  npm ci
  
  echo "🏗️  Building React app..."
  npm run build
  
  echo "📁 Copying build to web root..."
  sudo cp -r dist/* /var/www/taskflow-static/
  
  echo "♻️  Restarting app (zero downtime)..."
  cd ..
  pm2 reload ecosystem.config.cjs --env production
  
  echo "✅ Deployment complete!"
  pm2 status
ENDSSH

echo ""
echo "🎉 TaskFlow deployed successfully!"
echo "🌐 Live at: http://$SERVER_IP"
