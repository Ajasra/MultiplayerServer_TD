module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // Target browsers and Node.js versions
        targets: {
          browsers: [
            'last 2 Chrome versions',
            'last 2 Firefox versions',
            'last 2 Safari versions',
            'last 2 Edge versions',
            'iOS >= 12',
            'Android >= 8'
          ],
          node: '20' // Match Docker Node version
        },
        // Only polyfill features that are used and missing in target environments
        useBuiltIns: 'usage',
        corejs: { version: 3, proposals: true },
        // Enable tree shaking for better bundle size
        modules: false,
        // Include features needed for development
        include: [
          'transform-async-to-generator',
          'transform-object-rest-spread'
        ]
      }
    ],
    [
      '@babel/preset-react',
      {
        // Enable React 17+ automatic JSX runtime
        runtime: 'automatic',
        // Enable development features in development mode
        development: process.env.NODE_ENV === 'development',
        // Use classic runtime for better compatibility if needed
        // runtime: 'classic',
        // importSource: 'react' // Only needed for classic runtime
      }
    ]
  ],
  plugins: [
    // Support for class properties (class fields)
    '@babel/plugin-proposal-class-properties',
    
    // Runtime helpers to reduce bundle size
    [
      '@babel/plugin-transform-runtime',
      {
        // Use corejs for polyfills
        corejs: false,
        // Use helpers from @babel/runtime
        helpers: true,
        // Use regenerator runtime for async/await
        regenerator: true,
        // Use ES modules for better tree shaking
        useESModules: true
      }
    ]
  ],
  
  // Environment-specific configuration
  env: {
    development: {
      plugins: [
        // Enable React Fast Refresh for hot reloading
        // Note: This requires additional webpack configuration
        // 'react-refresh/babel'
      ]
    },
    production: {
      plugins: [
        // Remove console.log and other debug statements in production
        ['transform-remove-console', { exclude: ['error', 'warn'] }]
      ]
    },
    test: {
      // Use CommonJS modules for Jest compatibility
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            },
            modules: 'commonjs'
          }
        ],
        [
          '@babel/preset-react',
          {
            runtime: 'automatic'
          }
        ]
      ]
    }
  }
}; 