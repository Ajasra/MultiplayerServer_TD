import React, { Component } from 'react';
import { Container, Alert, Button, Stack, Text, Title } from '@mantine/core';
import IconAlertTriangle from '@tabler/icons-react/dist/esm/icons/IconAlertTriangle.mjs';
import IconRefresh from '@tabler/icons-react/dist/esm/icons/IconRefresh.mjs';
import IconHome from '@tabler/icons-react/dist/esm/icons/IconHome.mjs';

/**
 * Simple ErrorBoundary Component
 *
 * Catches catastrophic React errors that would crash the entire component tree.
 * For most other errors (API, validation, etc.), use Mantine notifications instead.
 *
 * Usage:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);

    // Report to error service if needed
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container size='sm' style={{ paddingTop: '2rem' }}>
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title='Something went wrong'
            color='red'
            variant='light'
          >
            <Stack spacing='md'>
              <Text size='sm'>
                The application encountered an unexpected error. Please try
                refreshing the page.
              </Text>

              <Stack spacing='xs'>
                <Button
                  leftSection={<IconRefresh size={16} />}
                  onClick={this.handleRetry}
                  size='sm'
                >
                  Try Again
                </Button>

                <Button
                  variant='subtle'
                  leftSection={<IconHome size={16} />}
                  onClick={() => (window.location.href = '/')}
                  size='sm'
                >
                  Go to Home
                </Button>
              </Stack>
            </Stack>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
