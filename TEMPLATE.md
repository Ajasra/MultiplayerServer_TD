# Game Server Template Documentation

## Architecture

```
[Game Engine / External Client] <--WebSocket--> [Express + Socket.io Server] <--WebSocket/REST--> [React Client]
                                                        |
                                                    [SQLite DB]
```

## File Structure

```
├── server.js                 # Express HTTP + Socket.io server entry point
├── src/
│   ├── config/settings.js    # Server configuration
│   ├── db/                   # SQLite database layer
│   │   ├── connection.js     # DB connection manager
│   │   ├── initDb.js         # Schema creation
│   │   ├── sessions.js       # Player session CRUD
│   │   ├── leaderboard.js    # Leaderboard operations
│   │   └── logging.js        # Structured logging
│   ├── game/
│   │   ├── Player.js         # Player class
│   │   └── gameStateManager.js # In-memory game state
│   ├── routes/
│   │   ├── character.js      # Player registration API
│   │   ├── leaderboard.js    # Leaderboard API
│   │   └── react.js          # React SPA routes
│   ├── utils/
│   │   ├── simpleLogger.js   # Winston logger
│   │   └── validationUtils.js # Input validators
│   ├── websocket/
│   │   ├── server.js         # Socket.io init + emitters
│   │   ├── clientManager.js  # Connection tracking
│   │   ├── gameNotifier.js   # External client notifications
│   │   └── handlers/         # Message handlers per client type
│   └── client/               # React frontend
│       ├── App.jsx           # Root with routing
│       ├── contexts/         # GameContext (WebSocket + state)
│       ├── components/
│       │   ├── mobile/       # Game screens + controls
│       │   ├── pages/        # Route-level pages
│       │   └── ui/           # Reusable UI components
│       └── hooks/            # Custom React hooks
├── webpack.config.js         # Client bundler
├── Dockerfile                # Production Docker image
└── docker-compose.yml        # Docker Compose setup
```

## Game Lifecycle

1. **Player Creation**: Via REST API (with or without image upload)
2. **Connection**: Player opens mobile interface, enters name, connects via WebSocket
3. **Waiting**: Connected but game not started. "Start Game" or "Auto Play" buttons.
4. **Active Play**: Joystick + button controls sent to server, stats received back.
5. **Completion**: Game engine reports finished state, leaderboard updated.
6. **Post-Game**: Stats displayed, result card generated, leaderboard viewable.

## Communication Frequencies

- Stats to mobile: 333ms (3Hz)
- Controls to external: 100ms (10Hz)
- Client input throttle: 33ms (30Hz)
- Heartbeats: 2000ms

## Tech Stack

- **Server**: Node.js, Express, Socket.io, SQLite, Winston
- **Client**: React 19, Mantine UI, Socket.io-client, Webpack 5
- **Deployment**: Docker, Docker Compose
