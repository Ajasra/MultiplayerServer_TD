import React from 'react';
import { AppShell, Container } from '@mantine/core';
import Header from './Header';
import Footer from './Footer';
import ErrorBoundary from './ErrorBoundary';

/**
 * MainLayout Component
 *
 * Standard layout for all regular pages with header, footer, and navigation.
 * Used for: /, /leaderboard
 */
export const MainLayout = ({
  children,
}) => {
  const content = (
    <Container size='xl'>
      <div className='glass-panel'>
        {children}
      </div>
    </Container>
  );

  return (
    <ErrorBoundary>
      <AppShell
        header={{ height: 70 }}
        footer={{ height: 60 }}
        padding='md'
        styles={{
          header: {
            backgroundColor: 'transparent',
          },
          main: {
            position: 'relative',
            overflow: 'hidden',
            minHeight: 'calc(100vh - 130px)',
          },
          footer: {
            backgroundColor: 'transparent',
            borderTop: 'none',
          },
        }}
      >
        <AppShell.Header withBorder={false}>
          <Header />
        </AppShell.Header>

        <AppShell.Main>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {content}
          </div>
        </AppShell.Main>

        <AppShell.Footer withBorder={false}>
          <Footer />
        </AppShell.Footer>
      </AppShell>
    </ErrorBoundary>
  );
};

/**
 * PlayerLayout Component
 *
 * Minimal layout for mobile game interface pages.
 * Used for: /player, /player/:characterId
 * No header/footer for full-screen mobile experience.
 */
export const PlayerLayout = ({ children }) => {
  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh' }}>{children}</div>
    </ErrorBoundary>
  );
};

// Default export for backward compatibility
const Layout = MainLayout;
export default Layout;

// Legacy component aliases for existing code
export const PageLayout = MainLayout;
export const GameLayout = PlayerLayout;
export const MobileGameLayout = PlayerLayout;
