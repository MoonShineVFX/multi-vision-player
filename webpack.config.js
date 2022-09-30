const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require("webpack");


module.exports = {
  entry: './src/host.ts',
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: [
      path.join(__dirname, 'dev_static')
    ],
    historyApiFallback: {
      index: '/index.html'
    },
    index: 'index.html',
    host: '0.0.0.0',
    port: 8000,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'js/[name].[fullhash].js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    }),
    new webpack.EnvironmentPlugin({
      'STREAM_HOST': ''
    })
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader']
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  }
};
