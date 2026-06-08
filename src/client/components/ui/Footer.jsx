import React from 'react';
import { Container, Text } from '@mantine/core';

/**
 * Footer Component
 *
 * Simple footer with copyright text.
 */
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Container size='xl' py='sm' style={{ backgroundColor: 'transparent' }}>
      <Text size='sm' c='gray.6' ta='center'>
        &copy; {currentYear} Game Server
      </Text>
    </Container>
  );
}

export default Footer;
