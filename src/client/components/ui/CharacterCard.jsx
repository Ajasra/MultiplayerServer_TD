import React, { memo } from 'react';
import { Box, Text } from '@mantine/core';
import PropTypes from 'prop-types';
import './CharacterCard.css';

/**
 * CharacterCard Component
 *
 * Displays player image with username overlay.
 *
 * @param {Object} props - Component props
 * @param {string} props.username - Player's username
 * @param {string} props.id - Character ID for image loading
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.frame - Whether to show frame border
 */
const CharacterCard = memo(
  ({ username, id, className = '', frame = false }) => {
    const getCharacterImageUrl = characterId => {
      if (!characterId) return null;
      return `/uploads/${characterId}`;
    };

    const characterImageUrl = getCharacterImageUrl(id);

    return (
      <Box className={`characterCard ${className}`}>
        {characterImageUrl && (
          <Box
            className='characterImage'
            style={{
              backgroundImage: `url(${characterImageUrl})`,
            }}
          />
        )}

        {frame && (
          <>
            {username && <Text className='username'>{username}</Text>}
          </>
        )}
      </Box>
    );
  }
);

CharacterCard.displayName = 'CharacterCard';

CharacterCard.propTypes = {
  username: PropTypes.string,
  id: PropTypes.string,
  className: PropTypes.string,
  frame: PropTypes.bool,
};

export default CharacterCard;
