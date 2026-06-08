import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

// Import theme and global styles
import theme from './theme';
import './styles/global.css';

// Import page components
import HomePage from './components/pages/HomePage';
import DailyLeaderboardPage from './components/pages/DailyLeaderboardPage';
import AllTimeLeaderboardPage from './components/pages/AllTimeLeaderboardPage';
import MobileGamePage from './components/pages/MobileGamePage';

// Import layout components
import ErrorBoundary from './components/ui/ErrorBoundary';

/**
 * MobileGameWrapper Component
 *
 * Clean wrapper that uses the simplified MobileGamePage with integrated
 * context management. The MobileGamePage extracts characterId from URL params internally.
 */
const MobileGameWrapper = () => {
  return <MobileGamePage />;
};

/**
 * App Component
 *
 * Main application component that handles routing for the Game Server.
 * Provides theme configuration, global providers, and route management.
 * Maintains separation between general website pages and mobile game interface.
 */
const App = () => {
  return (
    <MantineProvider theme={theme}>
      <Notifications position='top-right' />
      <ErrorBoundary>
        <Router>
          <Routes>
            {/* General website pages */}
            <Route path='/' element={<HomePage />} />
            <Route
              path='/leaderboard/daily'
              element={<DailyLeaderboardPage />}
            />
            <Route
              path='/leaderboard/alltime'
              element={<AllTimeLeaderboardPage />}
            />
            <Route
              path='/leaderboard'
              element={<Navigate to='/leaderboard/daily' replace />}
            />

            {/* Mobile game interface */}
            <Route
              path='/player/:characterId'
              element={<MobileGameWrapper />}
            />
            <Route path='/player' element={<MobileGameWrapper />} />

            {/* Fallback */}
            <Route path='*' element={<HomePage />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </MantineProvider>
  );
};

export default App;
