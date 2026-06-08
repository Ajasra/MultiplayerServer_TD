import { useState, useEffect, useRef } from 'react';

/**
 * usePlayerState Hook
 *
 * Fetches the current player state from the server API to determine
 * what screen to show initially when the mobile client loads.
 *
 * Returns:
 * - loading: boolean - whether the API call is in progress
 * - playerState: object with state info or null if loading/error
 * - error: string - error message if API call failed
 */
export const usePlayerState = characterId => {
  const [loading, setLoading] = useState(true);
  const [playerState, setPlayerState] = useState(null);
  const [error, setError] = useState(null);

  // Track previous state for debug logging only when state changes
  const prevStateRef = useRef({
    loading: true,
    playerState: null,
    error: null,
  });

  useEffect(() => {
    const fetchPlayerState = async () => {
      if (!characterId) {
        // Don't set error immediately - wait for characterId to be provided
        console.log('[usePlayerState] Waiting for characterId...');
        setLoading(true);
        setError(null);
        setPlayerState(null);
        return;
      }

      try {
        console.log(
          '[usePlayerState] Fetching data for characterId:',
          characterId
        );
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/character/${characterId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Player session not found');
          } else {
            setError(`Failed to fetch player state: ${response.status}`);
          }
          setLoading(false);
          return;
        }

        const data = await response.json();

        // Transform server response to our expected format
        const playerState = {
          characterId: data.characterId,
          username: data.username || null,
          state: data.state, // 'waiting', 'in_game', 'finished'
          hasUsername: !!data.username, // Check if username exists
          gameStats: data.game_stats || null,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt,
        };

        console.log('[usePlayerState] Fetched player state:', playerState);
        setPlayerState(playerState);
        console.log('[usePlayerState] State set, loading=false');
      } catch (fetchError) {
        console.error('Error fetching player state:', fetchError);
        setError('Network error: Could not connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerState();
  }, [characterId]);

  // Debug logging only when state actually changes (optional - can be removed entirely)
  useEffect(() => {
    const currentState = { loading, playerState: !!playerState, error };
    const prevState = prevStateRef.current;

    // Only log when state actually changes
    if (
      currentState.loading !== prevState.loading ||
      currentState.playerState !== prevState.playerState ||
      currentState.error !== prevState.error
    ) {
      console.log('[usePlayerState] State changed:', currentState);
      prevStateRef.current = currentState;
    }
  }, [loading, playerState, error]);

  return { loading, playerState, error };
};

export default usePlayerState;
