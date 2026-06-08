// src/db/sessions.js
const { getDB } = require('./connection');
const { logError } = require('./logging');

const SESSIONS_COLLECTION = 'user_sessions';
const CONTEXT = 'DB:SESSIONS';

function toEpochMillis(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function reviveSessionRow(row) {
  if (!row) return row;
  // Parse JSON fields
  if (typeof row.userdata === 'string') {
    try {
      row.userdata = JSON.parse(row.userdata);
    } catch {
      row.userdata = null;
    }
  }
  // Optionally convert epoch to Date objects if required by callers. We keep as numbers and adapt routes.
  return row;
}

async function createSession(sessionData) {
  try {
    const db = await getDB();
    const stmt = `INSERT INTO ${SESSIONS_COLLECTION}
      (_id, created, active, score, last_ping, username, kioskIdentifier, completed_at, final_time_played, final_lives_remaining, imageUrl, userdata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      sessionData._id,
      toEpochMillis(sessionData.created),
      sessionData.active ?? null,
      sessionData.score ?? null,
      toEpochMillis(sessionData.last_ping),
      sessionData.username ?? null,
      sessionData.kioskIdentifier ?? null,
      toEpochMillis(sessionData.completed_at),
      sessionData.final_time_played ?? null,
      sessionData.final_lives_remaining ?? null,
      sessionData.imageUrl ?? null,
      sessionData.userdata ? JSON.stringify(sessionData.userdata) : null,
    ];
    await db.run(stmt, params);
    return sessionData;
  } catch (err) {
    await logError('Error creating session', CONTEXT, err, sessionData?._id, {
      initialData: sessionData,
    });
    throw err;
  }
}

async function getSessionById(sessionId) {
  try {
    const db = await getDB();
    const row = await db.get(
      `SELECT * FROM ${SESSIONS_COLLECTION} WHERE _id = ?`,
      [sessionId]
    );
    return reviveSessionRow(row) || null;
  } catch (err) {
    await logError('Error getting session by ID', CONTEXT, err, sessionId);
    throw err;
  }
}

function buildUpdateClause(updateData) {
  const setClauses = [];
  const setParams = [];
  const incClauses = [];
  const incParams = [];

  if (updateData && updateData.$set) {
    for (const [key, value] of Object.entries(updateData.$set)) {
      let val =
        key.endsWith('_at') || key.endsWith('last_ping') || key === 'created'
          ? toEpochMillis(value)
          : value;
      if (key === 'userdata' && value && typeof value === 'object') {
        val = JSON.stringify(value);
      }
      setClauses.push(`${key} = ?`);
      setParams.push(val);
    }
  }
  if (updateData && updateData.$inc) {
    for (const [key, value] of Object.entries(updateData.$inc)) {
      incClauses.push(`${key} = COALESCE(${key}, 0) + ?`);
      incParams.push(Number(value) || 0);
    }
  }

  const clauses = [...setClauses, ...incClauses];
  const params = [...setParams, ...incParams];
  return { clauses, params };
}

async function updateSession(sessionId, updateData) {
  try {
    const db = await getDB();
    const { clauses, params } = buildUpdateClause(updateData);
    if (clauses.length === 0) {
      return await getSessionById(sessionId);
    }
    const sql = `UPDATE ${SESSIONS_COLLECTION} SET ${clauses.join(', ')} WHERE _id = ?`;
    await db.run(sql, [...params, sessionId]);
    const updated = await getSessionById(sessionId);
    return updated;
  } catch (err) {
    await logError('Error updating session', CONTEXT, err, sessionId, {
      updatePayload: updateData,
    });
    throw err;
  }
}

async function updateSessionState(
  sessionId,
  activeState,
  pingTime = new Date()
) {
  return updateSession(sessionId, {
    $set: { active: activeState, last_ping: toEpochMillis(pingTime) },
  });
}

async function updateSessionScore(sessionId, newScore) {
  return updateSession(sessionId, { $set: { score: newScore } });
}

async function incrementSessionScore(sessionId, scoreIncrement) {
  return updateSession(sessionId, { $inc: { score: scoreIncrement } });
}

async function getActiveOrWaitingSessions() {
  try {
    const db = await getDB();
    const rows = await db.all(
      `SELECT * FROM ${SESSIONS_COLLECTION} WHERE active IN (0,1)`
    );
    return rows.map(reviveSessionRow);
  } catch (err) {
    await logError('Error getting active/waiting sessions', CONTEXT, err);
    throw err;
  }
}

async function getSessionByImageFilename(filenameOrUrl) {
  try {
    const db = await getDB();
    // Normalize to just the filename
    const parsed = (filenameOrUrl || '').toString();
    const justName = parsed.split(/[\\/]/).pop();
    const likeUnix = `%/${justName}`; // ends with /filename
    const likeWin = `%\\${justName}`; // ends with \filename
    const fullUnix = `/uploads/${justName}`;

    const row = await db.get(
      `SELECT * FROM ${SESSIONS_COLLECTION}
       WHERE imageUrl = ?
          OR imageUrl = ?
          OR imageUrl LIKE ?
          OR imageUrl LIKE ?`,
      [justName, fullUnix, likeUnix, likeWin]
    );
    return reviveSessionRow(row) || null;
  } catch (err) {
    await logError(
      'Error getting session by image filename',
      CONTEXT,
      err,
      null,
      { filenameOrUrl }
    );
    throw err;
  }
}

module.exports = {
  createSession,
  getSessionById,
  updateSession,
  updateSessionState,
  updateSessionScore,
  incrementSessionScore,
  getActiveOrWaitingSessions,
  getSessionByImageFilename,
};
