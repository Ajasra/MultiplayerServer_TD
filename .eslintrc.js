module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended'
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react']
    }
  },
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    // React-specific rules
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+ automatic JSX runtime
    'react/prop-types': 'warn', // Warn about missing PropTypes
    'react/no-unused-prop-types': 'warn',
    'react/no-unused-state': 'warn',
    'react/prefer-stateless-function': 'warn',
    'react/jsx-uses-react': 'off', // Not needed with automatic JSX runtime
    'react/jsx-uses-vars': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-pascal-case': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-key': 'error',
    'react/no-danger': 'warn',
    'react/no-deprecated': 'warn',
    'react/no-direct-mutation-state': 'error',
    'react/no-typos': 'error',
    'react/no-string-refs': 'error',
    'react/no-unescaped-entities': 'warn',
    
    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Accessibility rules
    'jsx-a11y/alt-text': 'warn',
    'jsx-a11y/anchor-has-content': 'warn',
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    
    // General JavaScript rules
    'no-console': 'warn',
    'no-debugger': 'warn',
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'warn',
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    'comma-dangle': ['error', 'only-multiline'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-blocks': 'error',
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    
    // Performance rules for game client
    'no-loop-func': 'error',
    'no-new-func': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error'
  },
  overrides: [
    {
      // Specific rules for test files
      files: ['**/*.test.js', '**/*.test.jsx', '**/*.spec.js', '**/*.spec.jsx'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      // Server-side code (existing Express app)
      files: ['server.js', 'src/**/*.js'],
      excludedFiles: ['src/client/**/*.js', 'src/client/**/*.jsx'],
      env: {
        node: true,
        browser: false
      },
      rules: {
        'no-console': 'off' // Allow console.log in server code
      }
    },
    {
      // Client-side React code
      files: ['src/client/**/*.js', 'src/client/**/*.jsx'],
      env: {
        browser: true,
        node: false
      },
      rules: {
        'no-console': 'warn' // Warn about console.log in client code
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'public/dist/',
    'coverage/',
    '*.min.js',
    'TDclient/',
    'uploads/',
    'logs/'
  ]
}; 