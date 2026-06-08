const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createSession, getSessionById, updateSession } = require('../db/sessions');
const { logError, logWarn } = require('../db/logging');
const { getLeaderboardEntryByPlayerId } = require('../db/leaderboard');

// Function to sanitize filename - remove extension and special characters
const sanitizeFilename = filename => {
  const nameWithoutExt = path.parse(filename).name;
  return nameWithoutExt.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    const extension = path.extname(file.originalname);

    req.timestamp = timestamp;
    req.sanitizedOriginalName = sanitizedOriginalName;
    req.fileExtension = extension;

    const tempFilename = `temp-${timestamp}-${sanitizedOriginalName}${extension}`;
    req.tempFilename = tempFilename;

    cb(null, tempFilename);
  },
});

// File filter for image types
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG images are allowed.'), false);
    }
  } else {
    cb(new Error('Invalid file type. Only image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

const CONTEXT_UPLOAD = 'API:CHARACTER:UPLOAD';
const CONTEXT_GET = 'API:CHARACTER:GET';

// Validate username: 1-16 characters, alphanumeric + spaces + basic symbols
const isValidUsername = username => {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 1 && trimmed.length <= 16 && /^[a-zA-Z0-9 _-]+$/.test(trimmed);
};

/**
 * POST /api/character/upload
 * Upload character image and create session.
 */
router.post('/upload', (req, res, next) => {
  upload.single('characterImage')(req, res, async function (err) {
    const clientIp = req.ip;

    if (err instanceof multer.MulterError) {
      await logError('Multer error during upload', CONTEXT_UPLOAD, err, null, { clientIp, field: err.field });
      const error = new Error(
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large. Maximum size is 5MB.'
          : `Multer error: ${err.message}`
      );
      error.status = 400;
      return next(error);
    } else if (err) {
      await logError('File filter error during upload', CONTEXT_UPLOAD, err, null, { clientIp });
      const error = new Error(err.message);
      error.status = 400;
      return next(error);
    }

    if (!req.file) {
      await logWarn('Upload attempt without file', CONTEXT_UPLOAD, { expectedField: 'characterImage' }, null, clientIp);
      const error = new Error('No image file uploaded or invalid field name. Expected field: characterImage');
      error.status = 400;
      return next(error);
    }

    // Create character ID
    const characterId = `player-${req.timestamp}-${req.sanitizedOriginalName}${req.fileExtension}`;
    const finalFilename = characterId;
    const finalPath = path.join(uploadsDir, finalFilename);

    // Rename the temporary file to the final filename
    try {
      fs.renameSync(req.file.path, finalPath);
    } catch (renameErr) {
      await logError('Error renaming uploaded file', CONTEXT_UPLOAD, renameErr, null, { clientIp, tempPath: req.file.path, finalPath });
      fs.unlink(req.file.path, unlinkErr => {
        if (unlinkErr) console.error('Error deleting temporary file after rename failure:', unlinkErr);
      });
      const error = new Error('Failed to process uploaded file.');
      error.status = 500;
      return next(error);
    }

    const imageUrl = `/uploads/${characterId}`;
    const qrCodeUrl = `/player/${characterId}`;

    try {
      const sessionData = {
        _id: characterId,
        username: '', // Empty username - player will set it on first visit
        created: new Date(),
        active: 0,
        score: 0,
        last_ping: new Date(),
        imageUrl: imageUrl,
        userdata: {
          lives: 3,
          time_remaining: 0,
          power_ups: [],
        },
      };

      const newSession = await createSession(sessionData);

      if (!newSession) {
        fs.unlink(finalPath, unlinkErr => {
          if (unlinkErr) console.error('Error deleting orphaned uploaded file:', unlinkErr);
        });
        await logError('Failed to create session after upload', CONTEXT_UPLOAD, new Error('createSession returned null'), characterId, { clientIp });
        const error = new Error('Failed to create user session in database.');
        error.status = 500;
        return next(error);
      }

      res.status(201).json({
        success: true,
        characterId,
        imageUrl,
        qrCodeUrl,
      });
    } catch (dbError) {
      await logError('Server error processing character upload', CONTEXT_UPLOAD, dbError, characterId, { clientIp });
      if (finalPath && fs.existsSync(finalPath)) {
        fs.unlink(finalPath, unlinkErr => {
          if (unlinkErr) console.error('Error deleting uploaded file after DB error:', unlinkErr);
        });
      }
      return next(dbError);
    }
  });
});

/**
 * POST /api/player
 * Create a new player session without image upload.
 * Body: { username?: string }
 */
router.post('/player', async (req, res, next) => {
  const clientIp = req.ip;
  const { username } = req.body || {};

  const validUsername = username && username.trim() ? username.trim() : '';
  if (validUsername && !isValidUsername(validUsername)) {
    const error = new Error('Invalid username. Must be 1-16 alphanumeric characters.');
    error.status = 400;
    return next(error);
  }

  const timestamp = Date.now();
  const characterId = `player-${timestamp}-noupload`;

  try {
    const sessionData = {
      _id: characterId,
      username: validUsername,
      created: new Date(),
      active: 0,
      score: 0,
      last_ping: new Date(),
      imageUrl: '',
      userdata: {
        lives: 3,
        time_remaining: 0,
        power_ups: [],
      },
    };

    const newSession = await createSession(sessionData);

    if (!newSession) {
      const error = new Error('Failed to create player session.');
      error.status = 500;
      return next(error);
    }

    res.status(201).json({
      success: true,
      characterId,
      qrCodeUrl: `/player/${characterId}`,
    });
  } catch (dbError) {
    await logError('Error creating player session', 'API:PLAYER:CREATE', dbError, null, { clientIp });
    return next(dbError);
  }
});

/**
 * POST /api/character/:characterId/username
 * Set or update the username for a player session.
 * Body: { username: string }
 */
router.post('/:characterId/username', async (req, res, next) => {
  const { characterId } = req.params;
  const { username } = req.body || {};
  const clientIp = req.ip;

  if (!username || !username.trim()) {
    const error = new Error('Username is required.');
    error.status = 400;
    return next(error);
  }

  const trimmed = username.trim();

  if (!isValidUsername(trimmed)) {
    const error = new Error('Invalid username. Must be 1-16 characters (letters, numbers, spaces, dashes, underscores).');
    error.status = 400;
    return next(error);
  }

  try {
    const session = await getSessionById(characterId);
    if (!session) {
      const error = new Error('Player session not found.');
      error.status = 404;
      return next(error);
    }

    const updated = await updateSession(characterId, {
      $set: { username: trimmed },
    });

    if (!updated) {
      const error = new Error('Failed to update username.');
      error.status = 500;
      return next(error);
    }

    res.status(200).json({
      success: true,
      username: trimmed,
    });
  } catch (dbError) {
    await logError('Error updating username', 'API:CHARACTER:USERNAME', dbError, characterId, { clientIp });
    return next(dbError);
  }
});

/**
 * GET /api/character/:characterId
 * Retrieve character information and game state.
 */
router.get('/:characterId', async (req, res, next) => {
  const { characterId } = req.params;
  const clientIp = req.ip;

  try {
    const session = await getSessionById(characterId);

    if (!session) {
      const error = new Error('Character session not found.');
      error.status = 404;
      return next(error);
    }

    let characterState;
    let gameStats = null;

    switch (session.active) {
      case 0:
        characterState = 'waiting';
        break;
      case 1:
        characterState = 'in_game';
        break;
      case 2: {
        characterState = 'finished';
        const leaderboardEntry = await getLeaderboardEntryByPlayerId(characterId);
        if (leaderboardEntry) {
          gameStats = {
            score: leaderboardEntry.score,
            time_played: leaderboardEntry.time_played,
            lives_remaining: leaderboardEntry.lives_remaining,
          };
        }
        break;
      }
      default:
        characterState = 'unknown';
        logWarn(
          `Unknown session active state for character ${characterId}: ${session.active}`,
          CONTEXT_GET,
          { characterId, activeState: session.active }
        );
    }

    const responseData = {
      characterId: session._id,
      username: session.username || null,
      imageUrl: session.imageUrl,
      createdAt: (typeof session.created === 'number'
        ? new Date(session.created)
        : session.created instanceof Date
          ? session.created
          : new Date(session.created)
      ).toISOString(),
      state: characterState,
      isAuto: session.userdata?.isAuto || false,
      ...(gameStats && { game_stats: gameStats }),
    };

    res.status(200).json(responseData);
  } catch (dbError) {
    await logError('Error fetching character session', CONTEXT_GET, dbError, characterId, { clientIp });
    return next(dbError);
  }
});

module.exports = router;
