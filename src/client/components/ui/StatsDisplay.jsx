import React, { memo } from 'react';
import { Group, Text } from '@mantine/core';
import PropTypes from 'prop-types';
import './StatsDisplay.css';

/**
 * Simple StatsDisplay Component
 *
 * A simplified one-line stats display for the game screen.
 * Shows score, lives, and time in a simple horizontal layout.
 */
const StatsDisplay = memo(({ stats = {} }) => {
  // Extract stats with fallback values
  const { score = 0, lives = '-', time = '-' } = stats;

  // Format time value
  const formatTime = timeValue => {
    if (timeValue === '-' || timeValue === null || timeValue === undefined) {
      return '-';
    }

    // If it's already a formatted string, return as-is
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      return timeValue;
    }

    // If it's a number (seconds), format as MM:SS
    if (typeof timeValue === 'number') {
      const minutes = Math.floor(timeValue / 60);
      const seconds = Math.floor(timeValue % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return timeValue.toString();
  };

  // Format score with thousands separators
  const formatScore = scoreValue => {
    if (scoreValue === '-' || scoreValue === null || scoreValue === undefined) {
      return '-';
    }

    const numericScore = parseInt(scoreValue, 10);
    if (isNaN(numericScore)) return scoreValue;

    return numericScore.toLocaleString();
  };

  return (
    <Group justify='space-between' className='statsDisplayGroup'>
      <Text className='statsDisplayText'>
        Score
        <br /> {formatScore(score)}
      </Text>
      <Text className='statsDisplayText'>
        Lives
        <br /> {lives}
      </Text>
      <Text className='statsDisplayText'>
        Time
        <br /> {formatTime(time)}
      </Text>
    </Group>
  );
});

StatsDisplay.displayName = 'StatsDisplay';

StatsDisplay.propTypes = {
  stats: PropTypes.shape({
    score: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    lives: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    time: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};

export default StatsDisplay;
