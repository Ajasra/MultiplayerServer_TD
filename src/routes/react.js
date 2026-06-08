const express = require('express');
const router = express.Router();
const path = require('path');
const { getSessionById } = require('../db/sessions');
const { logWarn, logError } = require('../db/logging');

const REACT_CONTEXT = 'HTTP:REACT';

const getReactBaseUrl = () => {
  return process.env.NODE_ENV === 'production'
    ? process.env.REACT_BASE_URL || 'http://localhost'
    : 'http://localhost:3032';
};

/**
 * Serve the React application for mobile game interface
 * Route: GET /player/:characterId
 */
router.get('/player/:characterId', async (req, res, next) => {
  const { characterId } = req.params;

  try {
    // Validate that the character ID exists
    const session = await getSessionById(characterId);
    if (!session) {
      logWarn(
        'Attempt to access React app with invalid characterId',
        REACT_CONTEXT,
        { characterId }
      );
      return res
        .status(404)
        .send(
          'Session ID not found. Please ensure you have a valid join link.'
        );
    }

    // For development, redirect to the React dev server
    if (process.env.NODE_ENV !== 'production') {
      const baseUrl = getReactBaseUrl();
      return res.redirect(`${baseUrl}/player/${characterId}`);
    }

    // For production, serve the built React app from the 'public' directory
    const reactIndexPath = path.join(__dirname, '../../public/index.html');
    res.sendFile(reactIndexPath);
  } catch (error) {
    logError('Error serving React app', REACT_CONTEXT, error, { characterId });
    next(error);
  }
});

/**
 * Catch-all route for React routing - serves the React app for any unmatched routes
 * This handles React's client-side routing
 */
router.get('*', (req, res, next) => {
  // Only handle routes that should be React routes
  if (
    req.path.startsWith('/player/') ||
    req.path.startsWith('/leaderboard')
  ) {
    // For development, redirect to React dev server
    if (process.env.NODE_ENV !== 'production') {
      const baseUrl = getReactBaseUrl();
      return res.redirect(`${baseUrl}${req.path}`);
    }

    // For production, serve the built React app
    const reactIndexPath = path.join(__dirname, '../../public/index.html');
    return res.sendFile(reactIndexPath);
  }

  // For other routes, pass to next middleware (404 handler)
  next();
});

module.exports = router;
