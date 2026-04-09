#!/bin/bash

# Way Clans Bot - Automated VPS Installation Script
# Run this script on your VPS to automatically set up everything
# Usage: bash install-vps.sh

set -e

echo "================================"
echo "🚀 Way Clans Bot - VPS Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VPS_PATH="/home/way-clans"
APP_PATH="${VPS_PATH}/app"
DOMAIN="way.clans.idlebat.online"
REPO_URL="https://github.com/g3638114-glitch/Way-Clans.git"

# Functions
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_section() {
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "📌 $1"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Step 1: Update system
print_section "STEP 1: Updating system packages"
apt update > /dev/null 2>&1
apt upgrade -y > /dev/null 2>&1
print_status "System updated"

# Step 2: Install dependencies
print_section "STEP 2: Installing dependencies"
apt install -y curl wget git nano htop nginx certbot python3-certbot-nginx > /dev/null 2>&1
print_status "System packages installed"

# Step 3: Install Node.js
print_section "STEP 3: Installing Node.js"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt install -y nodejs > /dev/null 2>&1
    print_status "Node.js $(node --version) installed"
else
    print_status "Node.js $(node --version) already installed"
fi

# Step 4: Create directories
print_section "STEP 4: Creating directories"
mkdir -p ${VPS_PATH}
cd ${VPS_PATH}
print_status "Directory ${VPS_PATH} created"

# Step 5: Clone repository
print_section "STEP 5: Cloning repository"
if [ -d "${APP_PATH}" ]; then
    print_warning "Directory already exists, pulling latest changes..."
    cd ${APP_PATH}
    git pull origin main > /dev/null 2>&1
else
    git clone ${REPO_URL} app > /dev/null 2>&1
    cd ${APP_PATH}
fi
print_status "Repository cloned/updated"

# Step 6: Install npm dependencies
print_section "STEP 6: Installing npm dependencies"
npm install > /dev/null 2>&1
print_status "npm dependencies installed"

# Step 7: Create .env file
print_section "STEP 7: Configuring .env file"
if [ ! -f "${APP_PATH}/.env" ]; then
    cp ${APP_PATH}/.env.example ${APP_PATH}/.env
    print_status ".env file created"
    print_warning "⚠️  IMPORTANT: Edit the .env file with your actual values!"
    echo ""
    echo "  nano ${APP_PATH}/.env"
    echo ""
    echo "  You need to set:"
    echo "    - TELEGRAM_BOT_TOKEN (your bot token)"
    echo "    - SUPABASE_URL (your Supabase project URL)"
    echo "    - SUPABASE_KEY (your Supabase API key)"
    echo ""
else
    print_status ".env file already exists"
fi

# Step 8: Setup Nginx
print_section "STEP 8: Configuring Nginx"

# Create Nginx config
cat > /etc/nginx/sites-available/way-clans << 'EOF'
# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name way.clans.idlebat.online;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name way.clans.idlebat.online;

    ssl_certificate /etc/letsencrypt/live/way.clans.idlebat.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/way.clans.idlebat.online/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/way-clans-access.log;
    error_log /var/log/nginx/way-clans-error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /webhook {
        proxy_pass http://localhost:3000/webhook;
        proxy_http_version 1.1;
        proxy_set_header Content-Type application/json;
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/way-clans /etc/nginx/sites-enabled/way-clans
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
if nginx -t > /dev/null 2>&1; then
    systemctl restart nginx
    print_status "Nginx configured and running"
else
    print_error "Nginx configuration error"
    exit 1
fi

# Step 9: Get SSL certificate
print_section "STEP 9: Setting up SSL certificate (Let's Encrypt)"
if [ ! -d "/etc/letsencrypt/live/way.clans.idlebat.online" ]; then
    print_warning "Running certbot to obtain SSL certificate..."
    print_warning "You will be asked to enter an email address"
    certbot certonly --nginx -d way.clans.idlebat.online --non-interactive --agree-tos --email admin@example.com || true
    
    if [ -d "/etc/letsencrypt/live/way.clans.idlebat.online" ]; then
        print_status "SSL certificate obtained successfully"
        systemctl restart nginx
    else
        print_warning "SSL certificate setup requires interactive input"
        echo ""
        echo "Run manually:"
        echo "  certbot certonly --nginx -d way.clans.idlebat.online"
    fi
else
    print_status "SSL certificate already exists"
    systemctl enable certbot.timer
    systemctl start certbot.timer
fi

# Step 10: Setup systemd service
print_section "STEP 10: Setting up systemd service"
cp ${APP_PATH}/way-clans-bot.service /etc/systemd/system/way-clans-bot.service
systemctl daemon-reload
systemctl enable way-clans-bot
print_status "Systemd service installed"

# Step 11: Start the application
print_section "STEP 11: Starting the application"
systemctl start way-clans-bot
sleep 2

if systemctl is-active --quiet way-clans-bot; then
    print_status "Service started successfully"
else
    print_error "Service failed to start"
    echo ""
    echo "Check logs:"
    echo "  journalctl -u way-clans-bot -n 50"
    exit 1
fi

# Final status
print_section "✅ Installation Complete!"
echo ""
echo "  📍 Domain: https://way.clans.idlebat.online"
echo "  📁 App Path: ${APP_PATH}"
echo "  🤖 Bot Status: Running"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣  Edit your .env file with actual values:"
echo "    nano ${APP_PATH}/.env"
echo ""
echo "2️⃣  Setup Supabase:"
echo "    - Create project at https://supabase.com"
echo "    - Run SQL from: ${APP_PATH}/supabase-setup.sql"
echo "    - Copy URL and KEY to .env file"
echo ""
echo "3️⃣  Restart the service after updating .env:"
echo "    systemctl restart way-clans-bot"
echo ""
echo "📊 Useful commands:"
echo "    systemctl status way-clans-bot     # Check service status"
echo "    journalctl -u way-clans-bot -f     # View live logs"
echo "    systemctl restart way-clans-bot    # Restart service"
echo ""
echo "✨ Your bot is ready to go!"
echo ""
