let webpack = require('webpack');
let HtmlWebpackPlugin = require('html-webpack-plugin');
let path = require('path');
let ROOT_PATH = process.cwd();

module.exports = {
  entry: [
    'webpack-dev-server/client?http://127.0.0.1:8080',
    'webpack/hot/only-dev-server',
    './src/index.js'
  ],

  output: {
    filename: '[name].bundle.js',
    path: path.join(ROOT_PATH, 'dist')
  },

  devtool: 'cheap-module-inline-source-map',

  devServer: {
    historyApiFallback: true,
    disableHostCheck: true,
    hot: true,
    inline: true,
    host: '0.0.0.0'
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      title: 'qm player example',
      template: 'examples/index.html',
      inject: 'body'
    })
  ]
};
