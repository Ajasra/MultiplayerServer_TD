# Game Server Template

A real-time multiplayer game server template for creating interactive **big-screen experiences** with [TouchDesigner](https://derivative.ca) visuals and mobile phone controllers.

Built with **Express**, **Socket.io**, and **React** (Mantine UI).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## How It Works

```
[TouchDesigner - Big Screen]  <──WebSocket──>  [Game Server]  <──WebSocket/REST──>  [Phone Controllers]
```

1. **Players** connect via their phone browsers — they get a joystick + buttons to control the game
2. **The server** manages all game state in memory, batches player inputs, and syncs stats
3. **TouchDesigner** renders the game on a big screen / LED wall, sending back scores, lives, and game events
4. **Leaderboards** track daily and all-time high scores via SQLite

## Key Features

- Real-time WebSocket communication with Socket.io
- REST API for player management and leaderboards
- In-memory game state with SQLite persistence
- Mobile-friendly player controller (joystick + buttons)
- Auto-pilot and manual control modes
- Leaderboard with daily and all-time rankings
- Optional character image upload
- Docker containerization

## Quick Start

### Local Development

```bash
npm install --legacy-peer-deps
npm run dev:full
```

Open `http://localhost:3032` for the React app.  
The Express server runs on `http://localhost:3031`.

### With Docker

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/character/upload` | Upload image + create player session |
| `POST` | `/api/player` | Create player without image |
| `GET` | `/api/character/:id` | Get player session info |
| `POST` | `/api/character/:id/username` | Set player username |
| `GET` | `/api/leaderboard/daily` | Daily leaderboard |
| `GET` | `/api/leaderboard/alltime` | All-time leaderboard |

## WebSocket Protocol

Connect via Socket.io with query params:

| Param | Value | Description |
|-------|-------|-------------|
| `clientType` | `mobile` | Client type identifier |
| `characterId` | `<id>` | Player session ID |
| `username` | `<name>` | Player display name |

## Documentation

- [Local Development Setup](docs/SETUP.md)
- [Production Deployment](docs/DEPLOYMENT.md)
- [Template Customization Guide](docs/TEMPLATE-GUIDE.md)
- [Architecture Overview](TEMPLATE.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:full` | Start Express + React dev servers |
| `npm run dev` | Express only (with nodemon) |
| `npm run client:dev` | React dev server only |
| `npm run build` | Production build (React) |
| `npm start` | Production server |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
