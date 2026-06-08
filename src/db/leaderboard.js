const { getDB } = require('./connection');
const { logError } = require('./logging');

const LEADERBOARD_COLLECTION = 'leaderboard';
const CONTEXT = 'DB:LEADERBOARD';

function toEpochMillis(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function startAndEndOfToday() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

async function addLeaderboardEntry(entryData) {
  try {
    const db = await getDB();
    const stmt = `INSERT INTO ${LEADERBOARD_COLLECTION}
      (player_id, username, character_id, score, game_type, date, time_played, lives_remaining)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      entryData.player_id,
      entryData.username ?? null,
      entryData.character_id ?? null,
      entryData.score ?? null,
      entryData.game_type ?? null,
      toEpochMillis(entryData.date) ?? Date.now(),
      entryData.time_played ?? null,
      entryData.lives_remaining ?? null,
    ];
    const res = await db.run(stmt, params);
    return res?.lastID
      ? { id: res.lastID, ...entryData, date: params[5] }
      : null;
  } catch (err) {
    await logError(
      'Error adding leaderboard entry',
      CONTEXT,
      err,
      entryData?.player_id,
      { entryData }
    );
    throw err;
  }
}

async function getLeaderboard(gameType, period, limit = 10) {
  try {
    const db = await getDB();
    const baseWhere = ['game_type = ?'];
    const params = [gameType];

    if (period === 'daily') {
      const { startMs, endMs } = startAndEndOfToday();
      baseWhere.push('date >= ?');
      baseWhere.push('date < ?');
      params.push(startMs, endMs);
    }

    const sql = `SELECT * FROM ${LEADERBOARD_COLLECTION}
                 WHERE ${baseWhere.join(' AND ')}
                 ORDER BY score DESC
                 LIMIT ?`;
    params.push(Number(limit) || 10);
    const rows = await db.all(sql, params);
    return rows;
  } catch (err) {
    await logError('Error getting leaderboard', CONTEXT, err, null, {
      gameType,
      period,
      limit,
    });
    throw err;
  }
}

async function getLeaderboardEntryByPlayerId(playerId) {
  try {
    const db = await getDB();
    const row = await db.get(
      `SELECT * FROM ${LEADERBOARD_COLLECTION} WHERE player_id = ?`,
      [playerId]
    );
    return row || null;
  } catch (err) {
    await logError(
      'Error getting single leaderboard entry by player ID',
      CONTEXT,
      err,
      playerId
    );
    throw err;
  }
}

async function getLeaderboardTotalCount() {
  try {
    const db = await getDB();
    const row = await db.get(
      `SELECT COUNT(*) as count FROM ${LEADERBOARD_COLLECTION}`
    );
    return row?.count || 0;
  } catch (err) {
    await logError('Error getting leaderboard total count', CONTEXT, err);
    throw err;
  }
}

async function getLeaderboardPageByDateDesc(offset, limit) {
  try {
    const db = await getDB();
    const rows = await db.all(
      `SELECT * FROM ${LEADERBOARD_COLLECTION}
       ORDER BY date DESC
       LIMIT ? OFFSET ?`,
      [Number(limit) || 8, Number(offset) || 0]
    );
    return rows || [];
  } catch (err) {
    await logError(
      'Error getting leaderboard page by date',
      CONTEXT,
      err,
      null,
      { offset, limit }
    );
    throw err;
  }
}

module.exports = {
  addLeaderboardEntry,
  getLeaderboard,
  getLeaderboardEntryByPlayerId,
  getLeaderboardTotalCount,
  getLeaderboardPageByDateDesc,
};
