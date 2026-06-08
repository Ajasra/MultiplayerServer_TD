#!/usr/bin/env bash
set -euo pipefail

# Pin project name to ensure stable resource naming
export COMPOSE_PROJECT_NAME=gameserver

# Ensure persistent SQLite data directory exists
sudo mkdir -p /var/lib/gameserver-sqlite
# Adjust ownership if needed (match container user, often node=1000)
sudo chown -R 1000:1000 /var/lib/gameserver-sqlite || true

# Bring stack down to reattach volumes cleanly, remove orphans
docker compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans

# Start in detached mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Show status
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps