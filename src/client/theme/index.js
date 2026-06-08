import { createTheme } from '@mantine/core';

/**
 * Game Server - Mantine Theme Configuration
 */

const theme = createTheme({
  /** Essential Colors Only */
  colors: {
    // Primary brand colors (actually used)
    primary: [
      '#e3f2fd',
      '#bbdefb',
      '#90caf9',
      '#64b5f6',
      '#42a5f5',
      '#2196f3',
      '#1e88e5',
      '#1976d2',
      '#1565c0',
      '#0d47a1',
    ],

    // Simplified game colors (based on actual CSS usage)
    game: [
      '#ffebee',
      '#ffcdd2',
      '#ef9a9a',
      '#e57373',
      '#ef5350',
      '#dc3545',
      '#e53935',
      '#d32f2f',
      '#c62828',
      '#b71c1c', // dc3545 = existing CSS red
    ],

    // Essential grays (for UI elements)
    gray: [
      '#fafafa',
      '#f5f5f5',
      '#eeeeee',
      '#e0e0e0',
      '#bdbdbd',
      '#9e9e9e',
      '#757575',
      '#616161',
      '#424242',
      '#212121',
    ],
  },

  /** Primary Color Configuration */
  primaryColor: 'primary',

  /** Typography - Simplified */
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

  headings: {
    fontWeight: '600',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  /** Essential Layout Values */
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  /** Standard Breakpoints */
  breakpoints: {
    xs: '30em', // 480px
    sm: '48em', // 768px
    md: '64em', // 1024px
    lg: '74em', // 1184px
    xl: '90em', // 1440px
  },

  /** Essential Styling */
  radius: {
    xs: '0.125rem',
    sm: '0.25rem', // 4px - matches existing CSS
    md: '0.5rem', // 8px - matches existing CSS
    lg: '1rem',
    xl: '2rem',
  },

  shadows: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)', // matches existing CSS
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  },

  /** Minimal Component Overrides (only what's actually needed) */
  components: {
    Button: {
      styles: theme => ({
        root: {
          borderRadius: theme.radius.sm,
          transition: 'all 0.2s ease',
        },
      }),
    },

    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    },
  },
});

export default theme;
