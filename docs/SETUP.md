# Local Development Setup

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org))
- **npm** (included with Node.js)
- **Git** (optional)

## Option 1: Local (No Docker)

### Install & Run

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start both servers (Express + React)
npm run dev:full
```

### What Happens

- **Express server** starts on `http://localhost:3031` (with nodemon auto-restart)
- **React dev server** starts on `http://localhost:3032` (with hot module reload)
- WebSocket connections are proxied from React dev server to Express
- SQLite database is created at the path in `SQLITE_DB_PATH` env var (defaults to `./.sqlite-data/app.db`)

### Individual Server Start

```bash
# Express only (with auto-restart)
npm run dev

# React dev server only
npm run client:dev
```

### Configuration

Key environment variables (defaults in code):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3031` | Express/WebSocket server port |
| `SQLITE_DB_PATH` | `./.sqlite-data/app.db` | SQLite database file path |
| `NODE_ENV` | `development` | Environment mode |

A `.env` file is supported:

```env
PORT=3031
SQLITE_DB_PATH=./data/app.db
```

---

## Option 2: Docker

### Prerequisites

- **Docker** and **Docker Compose**

### Dev Environment

```bash
# Build and start
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Stop
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

The Docker dev setup:
- Mounts the project directory as a volume (hot reload supported)
- Runs both Express (port 3031) and React (port 3032)
- Persists SQLite data in `./.sqlite-data` volume
- Uses `Dockerfile.dev` for full dev dependencies

### Rebuilding After Dependency Changes

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

---

## Verifying It Works

1. Open `http://localhost:3032` — you should see the landing page
2. Create a player:
   ```bash
   curl -X POST http://localhost:3031/api/player \
     -H "Content-Type: application/json" \
     -d '{"username":"TestPlayer"}'
   ```
3. Open `http://localhost:3032/player/<characterId>` — you should see the game interface
4. Open `http://localhost:3032/leaderboard/daily` — leaderboard page

---

## Common Issues

### `npm install` fails with peer dependency conflicts
Use `npm install --legacy-peer-deps` (configured in this project).

### Port already in use
Change `PORT` in your environment or `.env` file.

### SQLite build errors on native modules
On Alpine/Docker: `apk add python3 make g++ sqlite-libs`  
On macOS: `brew install sqlite`  
On Windows: Pre-built binaries are included via npm.
