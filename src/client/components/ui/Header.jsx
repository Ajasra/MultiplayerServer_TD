import React from 'react';
import { Container, Group, Text } from '@mantine/core';
import Navigation from './Navigation';
import './Header.css';

/**
 * Header Component
 *
 * Transparent header with centered navigation and text logo.
 */
function Header() {
  return (
    <Container size='xl' h='100%' py='sm' className='header-container'>
      <Group position='apart' h='100%' className='header-inner'>
        {/* Logo/Brand - text-based */}
        <div className='logo-wrapper'>
          <Text fw={700} size='lg' c='white' style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '1px' }}>
            GAME SERVER
          </Text>
          <div className='logo-spacer' />
        </div>

        {/* Desktop Navigation - centered */}
        <div className='hide-mobile desktop-nav-center'>
          <Navigation variant='desktop' />
        </div>

        {/* Mobile Burger Menu and Drawer */}
        <div className='show-mobile mobile-nav-wrapper'>
          <Navigation variant='mobile' />
        </div>
      </Group>
    </Container>
  );
}

export default Header;
