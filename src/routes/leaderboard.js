const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../db/leaderboard'); // Import database function
const { logError } = require('../db/logging'); // Import logger

const CONTEXT_DAILY = 'API:LEADERBOARD:DAILY'; // Logging context
const CONTEXT_ALLTIME = 'API:LEADERBOARD:ALLTIME'; // Logging context

const settings = require('../config/settings');

/**
 * @swagger
 * /api/leaderboard/daily:
 *   get:
 *     summary: Retrieve daily top scores.
 *     description: Fetches the top scores for the current day. Allows filtering by game_type.
 *     parameters:
 *       - in: query
 *         name: game_type
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional game type to filter the leaderboard.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Optional limit for the number of scores to return.
 *     responses:
 *       200:
 *         description: Daily leaderboard retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   player_id:
 *                     type: string
 *                   score:
 *                     type: integer
 *                   date:
 *                     type: string
 *                     format: date
 *                   game_type:
 *                     type: string
 *       500:
 *         description: Internal server error.
 */
router.get('/daily', async (req, res) => {
  const { game_type } = req.query;
  const limit = parseInt(req.query.limit, 10) || settings.LEADERBOARD_LIMIT;
  const clientIp = req.ip;
  // Use a default game_type if needed, or make it mandatory based on requirements
  const effectiveGameType = game_type || settings.GAME_TYPE || 'default'; // Example: fall back to env var or hardcoded default

  try {
    console.log(
      `Fetching daily leaderboard for game type: ${effectiveGameType}, limit: ${limit}`
    );
    const leaderboard = await getLeaderboard(effectiveGameType, 'daily', limit);
    res.status(200).json(leaderboard);
  } catch (error) {
    // Error is already logged in getLeaderboard, but log here for API context
    await logError(
      'Error fetching daily leaderboard from API',
      CONTEXT_DAILY,
      error,
      null,
      { clientIp, gameType: effectiveGameType, limit }
    );
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch daily leaderboard.' });
  }
});

/**
 * @swagger
 * /api/leaderboard/alltime:
 *   get:
 *     summary: Retrieve all-time top scores.
 *     description: Fetches the all-time top scores. Allows filtering by game_type and limiting results.
 *     parameters:
 *       - in: query
 *         name: game_type
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional game type to filter the leaderboard.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Optional limit for the number of scores to return.
 *     responses:
 *       200:
 *         description: All-time leaderboard retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   player_id:
 *                     type: string
 *                   score:
 *                     type: integer
 *                   date:
 *                     type: string
 *                     format: date
 *                   game_type:
 *                     type: string
 *       500:
 *         description: Internal server error.
 */
router.get('/alltime', async (req, res) => {
  const { game_type } = req.query;
  const limit = parseInt(req.query.limit, 10) || settings.LEADERBOARD_LIMIT; // Default to 10 if not provided or invalid
  const clientIp = req.ip;
  const effectiveGameType = game_type || settings.GAME_TYPE || 'standard';

  try {
    console.log(
      `Fetching all-time leaderboard for game type: ${effectiveGameType}, limit: ${limit}`
    );
    const leaderboard = await getLeaderboard(
      effectiveGameType,
      'alltime',
      limit
    );
    res.status(200).json(leaderboard);
  } catch (error) {
    // Error is already logged in getLeaderboard, but log here for API context
    await logError(
      'Error fetching all-time leaderboard from API',
      CONTEXT_ALLTIME,
      error,
      null,
      { clientIp, gameType: effectiveGameType, limit }
    );
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all-time leaderboard.',
    });
  }
});

module.exports = router;
