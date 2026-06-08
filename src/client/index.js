/* global module */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import App from './App';
import theme from './theme';
import './styles/global.css';

// Get the root element
const container = document.getElementById('root');
const root = createRoot(container);

// Render the React app
root.render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>
);

// Hot Module Replacement (HMR)
if (module && module.hot) {
  module.hot.accept();
}
