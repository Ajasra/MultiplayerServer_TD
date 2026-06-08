const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isDocker = fs.existsSync('/.dockerenv');

// Common configuration shared between dev and production
const commonConfig = {
  entry: {
    // Main React app entry point
    main: './src/client/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    publicPath: '/',
    filename: 'dist/[name].[contenthash].js',
    chunkFilename: 'dist/[name].[contenthash].chunk.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg|woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'dist/assets/[name].[contenthash][ext]',
        },
      },
      {
        test: /\.(mp4|webm|ogg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'dist/media/[name].[contenthash][ext]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src/client'),
      '@components': path.resolve(__dirname, 'src/client/components'),
      '@hooks': path.resolve(__dirname, 'src/client/hooks'),
      '@contexts': path.resolve(__dirname, 'src/client/contexts'),
      '@utils': path.resolve(__dirname, 'src/client/utils'),
    },
  },
  plugins: [
    new CleanWebpackPlugin({
      // Preserve static assets that are manually placed in the public folder
      // These patterns are relative to output.path (i.e., the `public` directory)
      cleanOnceBeforeBuildPatterns: ['**/*', '!assets/**', '!manifest.json']
    }),
    new HtmlWebpackPlugin({
      template: './src/client/index.html',
      filename: 'index.html',
      inject: true,
    }),
  ],
};

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  if (isProduction) {
    // Production configuration
    return {
      ...commonConfig,
      mode: 'production',
      devtool: 'source-map',
      optimization: {
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
        usedExports: true,
        sideEffects: false,
      },
      performance: {
        hints: 'warning',
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
      },
    };
  } else {
    // Development configuration
    return {
      ...commonConfig,
      mode: 'development',
      devtool: 'eval-source-map',
      devServer: {
        static: {
          directory: path.join(__dirname, 'public'),
        },
        hot: true,
        open: false,
        port: 3032,
        host: '0.0.0.0', // Important for Docker
        allowedHosts: 'all',
        historyApiFallback: {
          rewrites: [
            { from: /^\/player/, to: '/index.html' },
            { from: /^\/leaderboard/, to: '/index.html' },
            { from: /./, to: '/index.html' },
          ],
        },
        proxy: [
          {
            context: ['/api', '/socket.io', '/uploads'],
            target: 'http://localhost:3031',
            changeOrigin: true,
            ws: true, // Enable WebSocket proxying
          },
        ],
      },
      watchOptions: {
        // Poll only in Docker (where file changes from host volumes are sometimes not detected automatically)
        poll: isDocker ? 1500 : false,
        aggregateTimeout: 500, // Wait 0.5s after a change before rebuilding
        ignored: ['**/node_modules'], // Explicitly ignore node_modules to save CPU
      },
    };
  }
}; 