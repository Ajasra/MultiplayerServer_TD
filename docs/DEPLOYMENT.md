# Production Deployment

## Prerequisites

- A Linux server (Ubuntu 20.04+ recommended)
- **Docker** and **Docker Compose** installed
- A domain with SSL (optional, use nginx/Caddy as reverse proxy)

---

## Option 1: Docker (Recommended)

### 1. Build the React App

Build the React frontend on your dev machine or CI:

```bash
npm install --legacy-peer-deps
npm run build
```

This creates the bundled files in `public/dist/`.

### 2. Prepare the Server

```bash
# Clone / copy the project to the server
scp -r ./ user@server:/home/apps/game-server/

# SSH into the server
ssh user@server
cd /home/apps/game-server
```

### 3. Create SQLite Data Directory

```bash
mkdir -p /var/lib/gameserver-sqlite
chmod 755 /var/lib/gameserver-sqlite
```

### 4. Configure Production Compose

Edit `docker-compose.prod.yml` to match your paths:

```yaml
services:
  app:
    volumes:
      - /home/apps/game-server:/usr/src/app
      - /usr/src/app/node_modules
      - /var/lib/gameserver-sqlite:/var/lib/gameserver-sqlite
    environment:
      NODE_ENV: production
      PORT: 3031
      TZ: UTC
      SQLITE_DB_PATH: /var/lib/gameserver-sqlite/app.db
    command: npm start
    restart: unless-stopped
```

### 5. Start

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Option 2: Manual (No Docker)

### 1. Install Dependencies

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Build tools for sqlite3
sudo apt install -y build-essential python3
```

### 2. Setup the Application

```bash
cd /home/apps/game-server

# Install production deps only
npm install --legacy-peer-deps --only=production

# Build the React client
npm run build
```

### 3. Configure Environment

Create `.env`:

```env
NODE_ENV=production
PORT=3031
SQLITE_DB_PATH=/var/lib/gameserver-sqlite/app.db
```

### 4. Create a Systemd Service

```ini
# /etc/systemd/system/game-server.service
[Unit]
Description=Game Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/apps/game-server
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3031
Environment=SQLITE_DB_PATH=/var/lib/gameserver-sqlite/app.db

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/lib/gameserver-sqlite
sudo chown www-data:www-data /var/lib/gameserver-sqlite
sudo systemctl enable game-server
sudo systemctl start game-server
```

### 5. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name game.example.com;

    location / {
        proxy_pass http://127.0.0.1:3031;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The `Upgrade` and `Connection` headers are **critical** for WebSocket support.

### 6. SSL (Certbot + Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d game.example.com
```

---

## Database Backup

### SQLite Backup

```bash
# Copy the database file
cp /var/lib/gameserver-sqlite/app.db /var/lib/gameserver-sqlite/app.db.backup

# Or via cron (daily at 2am)
0 2 * * * cp /var/lib/gameserver-sqlite/app.db /var/lib/gameserver-sqlite/backups/app-$(date +\%Y\%m\%d).db
```

---

## Health Checks

```bash
# Server health
curl http://localhost:3031/

# Leaderboard
curl http://localhost:3031/api/leaderboard/daily

# Create a test player
curl -X POST http://localhost:3031/api/player \
  -H "Content-Type: application/json" \
  -d '{"username":"HealthCheck"}'
```

---

## Monitoring

The server logs to:
- **Console**: All log levels
- **Files**: `./logs/application-%DATE%.log` and `./logs/error-%DATE%.log` (via Winston)

Check logs:
```bash
# Docker
docker logs game_server_app --tail 100 -f

# Systemd
journalctl -u game-server -f

# File logs
tail -f logs/application-*.log
```
