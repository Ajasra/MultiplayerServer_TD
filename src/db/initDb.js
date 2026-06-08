const { getDB } = require('./connection');

async function ensureColumns(db, tableName, columnDefs) {
  const rows = await db.all(`PRAGMA table_info(${tableName});`);
  const existing = new Set(rows.map(r => r.name));
  for (const { name, type } of columnDefs) {
    if (!existing.has(name)) {
      await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${name} ${type};`);
      console.log(`Added missing column ${name} to ${tableName}`);
    }
  }
}

async function initializeDatabase() {
  try {
    const db = await getDB();
    console.log('Initializing SQLite database schema and indexes...');

    // Optional performance settings
    await db.exec('PRAGMA foreign_keys = ON;');
    try {
      await db.exec('PRAGMA journal_mode = WAL;');
    } catch {
      // WAL mode may not be supported on some systems; ignore failure
    }

    // Tables
    await db.exec(`
			CREATE TABLE IF NOT EXISTS user_sessions (
				_id TEXT PRIMARY KEY,
				created INTEGER,
				active INTEGER,
				score INTEGER,
				last_ping INTEGER,
				username TEXT,
				kioskIdentifier TEXT,
				completed_at INTEGER,
				final_time_played INTEGER,
				final_lives_remaining INTEGER,
				imageUrl TEXT,
				userdata TEXT
			);

			CREATE TABLE IF NOT EXISTS leaderboard (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				player_id TEXT,
				username TEXT,
				character_id TEXT,
				score INTEGER,
				game_type TEXT,
				date INTEGER,
				time_played INTEGER,
				lives_remaining INTEGER
			);

			CREATE TABLE IF NOT EXISTS logs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				timestamp INTEGER,
				level TEXT,
				message TEXT,
				context TEXT,
				details TEXT,
				sessionId TEXT,
				clientIp TEXT
			);
		`);

    // Ensure new columns exist on existing DBs
    await ensureColumns(db, 'user_sessions', [
      { name: 'imageUrl', type: 'TEXT' },
      { name: 'userdata', type: 'TEXT' },
    ]);

    // Indexes
    await db.exec(`
			CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(active);
			CREATE INDEX IF NOT EXISTS idx_lb_game_type_score ON leaderboard(game_type, score DESC);
			CREATE INDEX IF NOT EXISTS idx_lb_game_type_date ON leaderboard(game_type, date DESC);
			CREATE INDEX IF NOT EXISTS idx_lb_player_id ON leaderboard(player_id);
			CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
			CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
			CREATE INDEX IF NOT EXISTS idx_logs_context ON logs(context);
		`);

    console.log('Database initialization complete.');
  } catch (err) {
    console.error('Error during database initialization:', err);
    process.exit(1);
  }
}

async function clearAllCollections() {
  try {
    const db = await getDB();
    console.log('Clearing all tables (dev-only recommended)...');
    await db.exec('DELETE FROM user_sessions;');
    await db.exec('DELETE FROM leaderboard;');
    await db.exec('DELETE FROM logs;');
    console.log('All specified tables cleared successfully.');
  } catch (err) {
    console.error('Error clearing tables:', err);
    throw err;
  }
}

module.exports = { initializeDatabase, clearAllCollections };
