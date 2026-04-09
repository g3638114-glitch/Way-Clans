#!/bin/bash

# Way Clans Bot Deployment Script
# This script deploys the bot to the VPS from GitHub

set -e

# Configuration
VPS_IP="194.33.35.18"
VPS_USER="root"
VPS_PATH="/home/way-clans"
REPO_URL="https://github.com/g3638114-glitch/Way-Clans.git"
REPO_NAME="Way-Clans"
DOMAIN="way.clans.idlebat.online"

echo "🚀 Starting deployment to VPS..."

# 1. Pull latest code from GitHub on VPS
echo "📥 Pulling latest code from GitHub..."
ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH}/app && git pull origin main"

# 2. Install dependencies
echo "📦 Installing dependencies..."
ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH}/app && npm install"

# 3. Stop the old service
echo "🛑 Stopping old service..."
ssh "${VPS_USER}@${VPS_IP}" "sudo systemctl stop way-clans-bot || true"

# 4. Copy service file
echo "⚙️ Setting up systemd service..."
ssh "${VPS_USER}@${VPS_IP}" "sudo cp ${VPS_PATH}/app/way-clans-bot.service /etc/systemd/system/"

# 5. Reload systemd and start service
echo "🔄 Reloading systemd..."
ssh "${VPS_USER}@${VPS_IP}" "sudo systemctl daemon-reload"

# 6. Start the service
echo "✅ Starting service..."
ssh "${VPS_USER}@${VPS_IP}" "sudo systemctl start way-clans-bot"

# 7. Enable service on boot
echo "📌 Enabling service on boot..."
ssh "${VPS_USER}@${VPS_IP}" "sudo systemctl enable way-clans-bot"

# 8. Check status
echo "📊 Service status:"
ssh "${VPS_USER}@${VPS_IP}" "sudo systemctl status way-clans-bot"

echo ""
echo "✨ Deployment completed!"
echo "🌐 Bot should be available at: https://${DOMAIN}"
echo "📝 Check logs with: ssh ${VPS_USER}@${VPS_IP} journalctl -u way-clans-bot -f"
