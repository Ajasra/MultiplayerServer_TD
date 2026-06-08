#!/bin/bash

# Install dependencies
npm install --legacy-peer-deps

# Build React frontend assets
NODE_OPTIONS="--max_old_space_size=2048" npm run client:build -- --progress

# Build Docker containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# Stop any existing containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down