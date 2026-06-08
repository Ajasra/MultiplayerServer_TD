import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Container,
  Text,
  Group,
  Select,
  TextInput,
  Pagination,
  Badge,
  Stack,
  Card,
  Title,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
  Paper,
  Alert,
} from '@mantine/core';
import IconSearch from '@tabler/icons-react/dist/esm/icons/IconSearch.mjs';
import IconSortAscending from '@tabler/icons-react/dist/esm/icons/IconSortAscending.mjs';
import IconSortDescending from '@tabler/icons-react/dist/esm/icons/IconSortDescending.mjs';
import IconRefresh from '@tabler/icons-react/dist/esm/icons/IconRefresh.mjs';
import IconAlertCircle from '@tabler/icons-react/dist/esm/icons/IconAlertCircle.mjs';
import PropTypes from 'prop-types';
import { useMediaQuery } from '@mantine/hooks';

/**
 * LeaderboardTable Component
 *
 * A comprehensive leaderboard table with sorting, filtering, and pagination.
 * Fetches data from the leaderboard API and provides an interactive interface
 * for viewing game scores and player statistics.
 *
 * @param {Object} props - Component props
 * @param {string} props.gameType - Game type to filter leaderboard (optional)
 * @param {string} props.period - Time period filter ('daily' or 'alltime')
 * @param {number} props.itemsPerPage - Number of items to display per page
 * @param {boolean} props.showSearch - Whether to show search functionality
 * @param {boolean} props.showPagination - Whether to show pagination controls
 * @param {boolean} props.showPeriodSelect - Whether to show the period selector
 * @param {number} props.autoRefreshMs - Interval in ms to auto-refresh data; 0 disables auto-refresh
 * @param {string} props.title - Table title
 */
const LeaderboardTable = ({
  gameType = 'standard',
  period = 'daily',
  itemsPerPage = 10,
  showSearch = true,
  showPagination = true,
  showPeriodSelect = true,
  autoRefreshMs = 30000,
  title = 'Leaderboard',
}) => {
  // Responsive: detect mobile viewport
  const isMobile = useMediaQuery('(max-width: 768px)');

  // State management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [periodFilter, setPeriodFilter] = useState(period);
  const [urlDisablesPagination, setUrlDisablesPagination] = useState(false);

  // Determine final pagination behavior: URL param takes precedence
  const showPaginationFinal = urlDisablesPagination ? false : showPagination;
  const topNFinal = urlDisablesPagination ? 15 : null;

  /**
   * Fetch leaderboard data from API
   */
  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (gameType) queryParams.append('game_type', gameType);

      const endpoint = periodFilter === 'daily' ? 'daily' : 'alltime';
      // Request enough items for client-side pagination on both periods
      queryParams.append('limit', 100);

      const response = await fetch(
        `/api/leaderboard/${endpoint}?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
      }

      const leaderboardData = await response.json();
      setData(leaderboardData);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Keep internal periodFilter in sync with prop when parent changes
  useEffect(() => {
    setPeriodFilter(period);
  }, [period]);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchLeaderboardData();
  }, [gameType, periodFilter]);

  // Read URL param to optionally disable pagination (e.g., ?pagination=false)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paginationParam = params.get('pagination');
      setUrlDisablesPagination(paginationParam === 'false');
    } catch (_) {
      // ignore if not in browser
    }
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return;
    const id = setInterval(() => {
      fetchLeaderboardData();
    }, autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs, gameType, periodFilter]);

  /**
   * Filter and sort data based on current state
   */
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        item =>
          item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.characterName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          item.player_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (sortBy === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [data, searchQuery, sortBy, sortOrder]);

  /**
   * Paginate the processed data
   */
  const paginatedData = useMemo(() => {
    if (!showPaginationFinal) {
      return topNFinal ? processedData.slice(0, topNFinal) : processedData;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return processedData.slice(startIndex, endIndex);
  }, [
    processedData,
    currentPage,
    itemsPerPage,
    showPaginationFinal,
    topNFinal,
  ]);

  /**
   * Handle column header click for sorting
   */
  const handleSort = column => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc'); // Default to descending for new columns
    }
  };

  /**
   * Get sort icon for column headers
   */
  const getSortIcon = column => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? (
      <IconSortAscending size={14} />
    ) : (
      <IconSortDescending size={14} />
    );
  };

  /**
   * Format date for display
   */
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  /**
   * Format score as integer
   */
  const formatScore = score => {
    const numeric = Number(score);
    if (!Number.isFinite(numeric)) return 0;
    return Math.trunc(numeric);
  };

  /**
   * Get rank for display with appropriate styling
   */
  const getRankBadge = index => {
    const rank = (currentPage - 1) * itemsPerPage + index + 1;
    let color = 'gray';

    if (rank === 1) color = 'yellow';
    else if (rank === 2) color = 'gray';
    else if (rank === 3) color = 'orange';
    else if (rank <= 10) color = 'blue';

    return (
      <Badge color={color} variant='filled'>
        {rank}
      </Badge>
    );
  };

  // Calculate total pages
  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  if (loading) {
    return (
      <Card shadow='sm' p='lg' radius='md' bg='transparent'>
        <Center py='xl'>
          <Stack align='center' gap='md'>
            <Loader size='lg' />
            <Text>Loading leaderboard...</Text>
          </Stack>
        </Center>
      </Card>
    );
  }

  if (error) {
    return (
      <Card shadow='sm' p='lg' radius='md' bg='transparent'>
        <Alert
          icon={<IconAlertCircle size={16} />}
          title='Error Loading Leaderboard'
          color='red'
          variant='outline'
        >
          <Text size='sm'>{error}</Text>
          {/* Removed refreshable prop, so no refresh button */}
        </Alert>
      </Card>
    );
  }

  return (
    <Card shadow='sm' p='lg' radius='md' bg='transparent'>
      <Stack gap='md'>
        {/* Header */}
        {/* <Group justify="space-between" align="center">
          <Title order={3}>{title}</Title>
        </Group> */}

        {/* Filters and Search */}
        <Group gap='md' wrap='wrap'>
          {showPeriodSelect && (
            <Select
              label='Period'
              value={periodFilter}
              onChange={setPeriodFilter}
              data={[
                { value: 'daily', label: 'Daily' },
                { value: 'alltime', label: 'All Time' },
              ]}
              style={{ minWidth: 120 }}
            />
          )}

          {showSearch && (
            <TextInput
              label='Search players'
              placeholder='Search by username or player ID...'
              value={searchQuery}
              onChange={event => setSearchQuery(event.currentTarget.value)}
              leftSection={<IconSearch size={14} />}
              style={{ flexGrow: 1, minWidth: 200 }}
            />
          )}
        </Group>

        {/* Results summary */}
        <Group justify='space-between' align='center'>
          <Text size='sm' c='dimmed'>
            Showing {paginatedData.length} of {processedData.length} entries
          </Text>
          {processedData.length === 0 && !loading && (
            <Text size='sm' c='dimmed'>
              No entries found
            </Text>
          )}
        </Group>

        {/* Table */}
        {processedData.length > 0 ? (
          <Paper bg='transparent'>
            <Table
              style={{
                backgroundColor: 'transparent',
                '--table-border-color': 'transparent',
              }}
            >
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: 'transparent' }}>
                  <Table.Th>Rank</Table.Th>
                  <Table.Th
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('username')}
                  >
                    <Group gap='xs'>Player {getSortIcon('username')}</Group>
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('score')}
                  >
                    <Group gap='xs'>Score {getSortIcon('score')}</Group>
                  </Table.Th>
                  {periodFilter === 'alltime' && !isMobile && (
                    <Table.Th
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('date')}
                    >
                      <Group gap='xs'>Date {getSortIcon('date')}</Group>
                    </Table.Th>
                  )}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedData.map((entry, index) => (
                  <Table.Tr
                    key={entry._id || entry.player_id}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <Table.Td>{getRankBadge(index)}</Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text
                          fw={500}
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          {entry.username || entry.characterName || 'Anonymous'}
                        </Text>
                        {/* <Text size="xs" c="dimmed">
                          {entry.player_id}
                        </Text> */}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600} size='lg'>
                        {formatScore(entry.score)}
                      </Text>
                    </Table.Td>
                    {periodFilter === 'alltime' && !isMobile && (
                      <Table.Td>
                        <Text size='sm'>{formatDate(entry.date)}</Text>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        ) : (
          <Center py='xl'>
            <Stack align='center' gap='xs'>
              <Loader size='sm' />
              <Text size='sm' c='dimmed'>
                {loading ? 'Loading leaderboard...' : 'No data available'}
              </Text>
            </Stack>
          </Center>
        )}

        {/* Pagination */}
        {showPaginationFinal && totalPages > 1 && (
          <Group justify='center' mt='md'>
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
              size='sm'
              withEdges
            />
          </Group>
        )}
      </Stack>
    </Card>
  );
};

LeaderboardTable.propTypes = {
  gameType: PropTypes.string,
  period: PropTypes.oneOf(['daily', 'alltime']),
  itemsPerPage: PropTypes.number,
  showSearch: PropTypes.bool,
  showPagination: PropTypes.bool,
  showPeriodSelect: PropTypes.bool,
  autoRefreshMs: PropTypes.number,
  title: PropTypes.string,
};

export default LeaderboardTable;
