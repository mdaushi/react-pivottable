const webpack = require('webpack');
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: [
    './examples/index.jsx',
  ],
  output: {
    filename: 'bundle.js',
    path: __dirname,
  },
  module: {
    rules: [
      {
        test: /\.m?jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {modules: false}],
              '@babel/preset-react',
            ],
            plugins: [
              'react-refresh/babel',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.mjs', '.mjsx'],
  },
  plugins: [new ReactRefreshPlugin()],
  devServer: {
    static: './examples',
    hot: true,
    port: 8080,
  },
};
