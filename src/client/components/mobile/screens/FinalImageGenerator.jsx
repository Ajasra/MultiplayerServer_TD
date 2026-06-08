import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Text,
  Button,
  Card,
  Image,
  Loader,
  Alert,
  Group,
} from '@mantine/core';
import IconDownload from '@tabler/icons-react/dist/esm/icons/IconDownload.mjs';
import IconPhoto from '@tabler/icons-react/dist/esm/icons/IconPhoto.mjs';
import PropTypes from 'prop-types';

/**
 * FinalImageGenerator Component
 *
 * Generates a simple downloadable game result card using HTML5 Canvas.
 * Template version: clean card with player image, username, and score.
 */
const FinalImageGenerator = ({
  characterId,
  username,
  stats,
  onReturnToStart,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [finalImageUrl, setFinalImageUrl] = useState(null);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateImage = useCallback(async () => {
    if (!characterId || !username || hasGenerated || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const cardWidth = 800;
      const cardHeight = 600;
      canvas.width = cardWidth;
      canvas.height = cardHeight;

      // Draw card background
      const gradient = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.5, '#16213e');
      gradient.addColorStop(1, '#0f3460');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      // Draw rounded rectangle border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 4;
      const borderRadius = 20;
      ctx.beginPath();
      ctx.moveTo(borderRadius, 0);
      ctx.lineTo(cardWidth - borderRadius, 0);
      ctx.quadraticCurveTo(cardWidth, 0, cardWidth, borderRadius);
      ctx.lineTo(cardWidth, cardHeight - borderRadius);
      ctx.quadraticCurveTo(cardWidth, cardHeight, cardWidth - borderRadius, cardHeight);
      ctx.lineTo(borderRadius, cardHeight);
      ctx.quadraticCurveTo(0, cardHeight, 0, cardHeight - borderRadius);
      ctx.lineTo(0, borderRadius);
      ctx.quadraticCurveTo(0, 0, borderRadius, 0);
      ctx.closePath();
      ctx.stroke();

      // Load and draw player image
      const playerImage = new window.Image();
      playerImage.crossOrigin = 'anonymous';

      await new Promise((resolve) => {
        playerImage.onload = () => {
          const imageAreaWidth = cardWidth * 0.6;
          const imageAreaHeight = cardHeight * 0.5;
          const imageAspect = playerImage.width / playerImage.height;
          const areaAspect = imageAreaWidth / imageAreaHeight;

          let drawWidth, drawHeight, drawX, drawY;

          if (imageAspect > areaAspect) {
            drawWidth = imageAreaWidth;
            drawHeight = imageAreaWidth / imageAspect;
            drawX = (cardWidth - drawWidth) / 2;
            drawY = cardHeight * 0.1 + (imageAreaHeight - drawHeight) / 2;
          } else {
            drawHeight = imageAreaHeight;
            drawWidth = imageAreaHeight * imageAspect;
            drawX = (cardWidth - drawWidth) / 2;
            drawY = cardHeight * 0.1;
          }

          // Image background circle
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.beginPath();
          ctx.arc(cardWidth / 2, cardHeight * 0.35, cardHeight * 0.28, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(playerImage, drawX, drawY, drawWidth, drawHeight);
          resolve();
        };

        playerImage.onerror = () => {
          resolve();
        };

        playerImage.src = `/uploads/${characterId}`;
      });

      // Draw username
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 4;
      ctx.fillText(username.toUpperCase(), cardWidth / 2, cardHeight * 0.78);

      // Draw score
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.fillStyle = '#ffd700';
      const scoreValue = stats?.score !== undefined
        ? parseInt(stats.score).toLocaleString()
        : 'N/A';
      ctx.fillText(scoreValue, cardWidth / 2, cardHeight * 0.88);

      // Draw "SCORE" label
      ctx.font = '18px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('SCORE', cardWidth / 2, cardHeight * 0.82);

      canvas.toBlob(
        blob => {
          if (blob) {
            const imageUrl = URL.createObjectURL(blob);
            setFinalImageUrl(imageUrl);
            setHasGenerated(true);
          } else {
            setError('Failed to create image');
          }
        },
        'image/png',
        0.95
      );
    } catch (err) {
      console.error('[FinalImageGenerator] Error:', err);
      setError(err.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  }, [characterId, username, stats, hasGenerated, isGenerating]);

  const downloadImage = useCallback(() => {
    if (!finalImageUrl) return;
    const link = document.createElement('a');
    link.href = finalImageUrl;
    link.download = `${username}-game-result.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [finalImageUrl, username]);

  const retryGeneration = useCallback(() => {
    setHasGenerated(false);
    setError(null);
    if (finalImageUrl) {
      URL.revokeObjectURL(finalImageUrl);
      setFinalImageUrl(null);
    }
  }, [finalImageUrl]);

  useEffect(() => {
    if (characterId && username && stats && !hasGenerated && !isGenerating) {
      generateImage();
    }
  }, [characterId, username, stats, hasGenerated, isGenerating, generateImage]);

  useEffect(() => {
    if (!hasGenerated && !isGenerating && characterId && username && stats) {
      generateImage();
    }
  }, [hasGenerated, isGenerating, characterId, username, stats, generateImage]);

  useEffect(() => {
    return () => {
      if (finalImageUrl) {
        URL.revokeObjectURL(finalImageUrl);
      }
    };
  }, [finalImageUrl]);

  return (
    <Stack gap='md' w='100%' align='center'>
      {isGenerating && (
        <Card className='statsCard' style={{ width: '100%' }}>
          <Stack align='center' gap='sm'>
            <Loader size='md' />
            <Text size='sm' ta='center'>
              Creating your result card...
            </Text>
          </Stack>
        </Card>
      )}

      {error && (
        <Alert
          color='red'
          title='Image Generation Error'
          style={{ width: '100%' }}
        >
          <Text size='sm'>{error}</Text>
          <Button
            size='xs'
            variant='light'
            color='red'
            mt='xs'
            leftSection={<IconPhoto size={16} />}
            onClick={retryGeneration}
          >
            Try Again
          </Button>
        </Alert>
      )}

      {finalImageUrl && (
        <Image
          src={finalImageUrl}
          alt='Final game card'
        />
      )}

      {finalImageUrl && !isGenerating && (
        <Button
          onClick={downloadImage}
          className='gameButton'
          size='lg'
          color='blue'
        >
          Download Card
        </Button>
      )}
    </Stack>
  );
};

FinalImageGenerator.propTypes = {
  characterId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  stats: PropTypes.shape({
    score: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
};

export default FinalImageGenerator;
