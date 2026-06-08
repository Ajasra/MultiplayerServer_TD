import React from 'react';
import {
  Group,
  Button,
  UnstyledButton,
  Text,
  ThemeIcon,
  Stack,
  Drawer,
  Burger,
} from '@mantine/core';
import './Navigation.css';
import { useDisclosure } from '@mantine/hooks';
import IconHome from '@tabler/icons-react/dist/esm/icons/IconHome.mjs';
import IconTrophy from '@tabler/icons-react/dist/esm/icons/IconTrophy.mjs';
import { Link, useLocation } from 'react-router-dom';

/**
 * Navigation Component
 *
 * Reusable navigation component that can be used in headers, sidebars,
 * mobile menus, etc. Supports different display variants.
 *
 * Features:
 * - Multiple display variants (buttons, links, navbar)
 * - Active page highlighting
 * - Icon support
 * - Responsive design
 * - Customizable styling
 */

export const navigationItems = [
  {
    label: 'Home',
    href: '/',
    icon: IconHome,
    description: 'Main page and game info',
  },
  {
    label: 'Leaderboard Today',
    href: '/leaderboard/daily',
    icon: IconTrophy,
    description: 'Today\'s top scores',
  },
  {
    label: 'Leaderboard All-Time',
    href: '/leaderboard/alltime',
    icon: IconTrophy,
    description: 'Best scores of all time',
  },
];

const NavLink = ({ item, onClick, isMobile = false, isActivePage }) => {
  const Icon = item.icon;
  const isActive = isActivePage ? isActivePage(item.href) : false;
  const linkFontFamily =
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  if (isMobile) {
    return (
      <UnstyledButton
        component={Link}
        to={item.href}
        onClick={onClick}
        p='md'
        className={`nav-mobile ${isActive ? 'is-active' : ''}`}
        style={{
          borderRadius: '8px',
          color: '#ffffff',
          display: 'block',
          width: '100%',
          fontFamily: linkFontFamily,
        }}
      >
        <Group spacing='sm'>
          <ThemeIcon
            variant={isActive ? 'filled' : 'light'}
            color={isActive ? '#7f41d4' : '#7f41d4'}
            size='sm'
          >
            <Icon size={16} />
          </ThemeIcon>
          <div>
            <Text
              size='sm'
              weight={isActive ? 600 : 400}
              c='#ffffff'
              className='nav-label'
              style={{ textDecoration: isActive ? 'underline' : 'none' }}
            >
              {item.label}
            </Text>
            <Text size='xs' color='dimmed' mt={2}>
              {item.description}
            </Text>
          </div>
        </Group>
      </UnstyledButton>
    );
  }

  return (
    <Button
      component={Link}
      to={item.href}
      variant='subtle'
      leftSection={<Icon size={18} />}
      size='md'
      className={`nav-desktop-link ${isActive ? 'active-link' : ''}`}
      styles={{
        root: {
          color: '#ffffff',
        },
      }}
    >
      {item.label}
    </Button>
  );
};

function Navigation({
  variant = 'buttons',
  orientation = 'horizontal',
  size = 'sm',
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const location = useLocation();

  const isActivePage = href => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  // Desktop Navigation
  if (variant === 'desktop') {
    return (
      <Group
        spacing='xl'
        className='hide-mobile nav-desktop'
        style={{ justifyContent: 'center', flexWrap: 'nowrap' }}
      >
        {navigationItems.map(item => (
          <NavLink key={item.href} item={item} isActivePage={isActivePage} />
        ))}
      </Group>
    );
  }

  // Mobile Navigation (Drawer with Burger icon)
  if (variant === 'mobile') {
    return (
      <>
        <Burger
          opened={opened}
          onClick={() => (opened ? close() : open())}
          className='show-mobile'
          size='sm'
          color='#ffffff'
          aria-label={opened ? 'Close navigation menu' : 'Open navigation menu'}
        />

        <Drawer
          opened={opened}
          onClose={close}
          title={null}
          styles={{
            header: {
              backgroundColor: '#000',
              color: '#fff',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            },
            content: { backgroundColor: '#000', color: '#fff' },
            close: { color: '#fff' },
          }}
          padding='md'
          size='sm'
          position='right'
        >
          <Stack spacing='xs'>
            {navigationItems.map(item => (
              <NavLink
                key={item.href}
                item={item}
                onClick={close}
                isMobile={true}
                isActivePage={isActivePage}
              />
            ))}
          </Stack>
        </Drawer>
      </>
    );
  }

  return null;
}

export default Navigation;
