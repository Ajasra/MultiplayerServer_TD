# Template Customization Guide

Step-by-step instructions for turning this template into your own big-screen interactive game server.

## What This Template Provides

- **WebSocket server** that relays player inputs to a game engine (TouchDesigner, Unity, etc.)
- **Phone controller UI** with joystick + buttons for players to interact with the big screen
- **In-memory game state** manager with SQLite persistence
- **Leaderboard system** (daily + all-time)
- **Optional image upload** for player avatars
- **Docker deployment** ready

---

## Step 1: Clone & Rename

```bash
git clone <repo-url> my-game-server
cd my-game-server
```

Update project metadata in `package.json`:

```json
{
  "name": "my-game-server",
  "version": "1.0.0",
  "description": "Your game description here"
}
```

---

## Step 2: Install & Verify

```bash
npm install --legacy-peer-deps
npm run dev:full
```

Open `http://localhost:3032` — you should see the landing page with "Game Server" heading.

---

## Step 3: Brand the Client UI

### 3.1 Update the Text Branding

These files contain user-visible text:

| File | What to Change |
|------|---------------|
| `src/client/components/pages/HomePage.jsx` | Hero title, tagline, description text |
| `src/client/components/ui/Header.jsx` | Logo text ("GAME SERVER" → your project name) |
| `src/client/components/ui/Footer.jsx` | Copyright text |
| `src/client/components/mobile/screens/UsernameEntryScreen.jsx` | Welcome text |
| `src/client/components/mobile/screens/GameOverScreen.jsx` | Game over message |
| `src/client/index.html` | `<title>`, meta description |

### 3.2 Update Theme Colors

Edit `src/client/theme/index.js` to match your brand:

```javascript
const theme = createTheme({
  primaryColor: 'violet',  // Change to your brand color
  colors: {
    // Add custom color palette here
  },
  // ...
});
```

### 3.3 Add Your Logo

1. Place your logo image at `src/client/assets/images/logo.png`
2. Update `src/client/components/ui/Header.jsx`:
   ```jsx
   import logo from '@/assets/images/logo.png';
   // Replace the <Text> with <img src={logo} ... />
   ```

### 3.4 Custom Game Background/Theme

Edit `src/client/components/mobile/screens/MobileScreen.css`:

```css
.mobileScreenOverlay {
  /* Replace gradient with your game's background */
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}
```

---

## Step 4: Customize Game Logic

### 4.1 Player Properties

Edit `src/game/Player.js` to add custom properties:

```javascript
class Player {
  constructor(playerId, username, socketId, imageUrl, active = 0) {
    // ... existing properties
    
    // ADD YOUR CUSTOM PROPERTIES:
    this.characterClass = 'warrior';  // Example
    this.inventory = [];              // Example
    this.customData = {};             // Example
  }
}
```

### 4.2 Game State Management

Edit `src/game/gameStateManager.js` to add custom logic:

- `addOrUpdatePlayer()` — called when a player connects
- `updatePlayerControls()` — called when joystick/button input arrives
- `updatePlayerStatsFromTD()` — called when external game engine sends stats
- `getControlBatchForTouchDesigner()` — builds the batch sent to external engine.

### 4.3 Player Registration

Edit `src/routes/character.js`:

- Change `characterId` format (currently `player-{timestamp}-{name}.{ext}`)
- Add custom session data in `sessionData.userdata`
- Change default lives or starting parameters

### 4.4 Database Schema

Edit `src/db/initDb.js` to add custom tables or columns:

```sql
ALTER TABLE user_sessions ADD COLUMN custom_field TEXT;
```

Or add entirely new tables:

```javascript
await db.exec(`
  CREATE TABLE IF NOT EXISTS game_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT,
    event_type TEXT,
    event_data TEXT,
    timestamp INTEGER
  )
`);
```

---

## Step 5: Customize WebSocket Protocol

### 5.1 Mobile Handlers

Edit `src/websocket/handlers/mobileHandler.js`:

- Add new message types your client should handle
- Modify input processing (joystick scaling, button mapping)
- Add custom game actions

### 5.2 External Engine Handlers

Edit `src/websocket/handlers/touchdesignerHandler.js`:

- Rename `touchdesigner` → your external engine name throughout
- Modify the stats format expected from your game engine
- Add custom event types

### 5.3 Stats Format

Edit `src/websocket/server.js` — the `startStatsEmitter()` function:

```javascript
const statsPayload = {
  type: 'stats',
  clientType: 'server',
  id: player.playerId,
  score: player.stats.score,
  lives: player.stats.lives,
  time: player.stats.time,
  // ADD YOUR CUSTOM STATS:
  // health: player.stats.health,
  // mana: player.stats.mana,
};
```

---

## Step 6: Customize the Client Screens

### 6.1 Add New Game State

Edit `src/client/contexts/GameContext.jsx`:

```javascript
export const GAME_STATES = {
  NAME_ENTRY: 'name_entry',
  CONNECTING: 'connecting',
  READY: 'ready',
  PLAYING: 'playing',
  FINISHED: 'finished',
  // ADD YOUR STATES:
  // LOBBY: 'lobby',
  // SPECTATING: 'spectating',
};
```

### 6.2 Add New Screen

1. Create `src/client/components/mobile/screens/YourScreen.jsx`
2. Add to `src/client/components/mobile/screens/index.js`
3. Add case in `GameStateInterface.jsx` `renderScreen()`
4. Add props in the `screenProps` memo

### 6.3 Custom Joystick Behavior

Edit `src/client/config/settings.js`:

```javascript
export default {
  CLIENT_JOYSTICK_THROTTLE_MS: 33,  // Change throttle rate (33ms = 30Hz)
};
```

### 6.4 Result Card Generator

Edit `src/client/components/mobile/screens/FinalImageGenerator.jsx`:

- Change card dimensions
- Change colors, fonts, layout
- Add custom stats or text overlay

---

## Step 7: Rename / Rebrand Server

### Files to Update

| Search For | Replace With |
|-----------|--------------|
| `game_server_app` (docker-compose) | `your_app_name` |
| `gameserver` (in docs/logs) | `your-game-name` |
| `Game Server` (user-facing text) | Your project name |

### Default Ports

To change the default ports, update:

```
docker-compose.yml — ports mapping
docker-compose.dev.yml — PORT env
server.js — PORT default (line 30)
webpack.config.js — devServer port (line 119)
scripts/dev-coordinator.js — expressPort/reactPort
```

---

## Step 8: Production Checklist

Before deploying:

- [ ] Change all default ports if conflicting
- [ ] Set `NODE_ENV=production`
- [ ] Update `SQLITE_DB_PATH` to a persistent location
- [ ] Set up SSL with reverse proxy (see [DEPLOYMENT.md](DEPLOYMENT.md))
- [ ] Update CORS in `src/websocket/server.js` (currently `'*'` in dev)
- [ ] Remove `console.log` statements from production build (babel config already strips them)
- [ ] Set up database backups
- [ ] Configure monitoring (logs are in `./logs/` directory)

---

## Architecture Reference

See `TEMPLATE.md` for full architecture documentation including:

- File structure map
- Game lifecycle diagram
- Data flow patterns
- Communication frequencies
