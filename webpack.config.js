const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    entry: {
      popup: './popup.js',
      background: './background.js',
      content: './content.js'
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },

    mode: isDevelopment ? 'development' : 'production',
    
    devtool: isDevelopment ? 'cheap-module-source-map' : false,

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'icons/[name][ext]'
          }
        }
      ]
    },

    plugins: [
      new MiniCssExtractPlugin({
        filename: 'css/[name].css'
      }),

      new HtmlWebpackPlugin({
        template: './popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
        minify: !isDevelopment
      })
    ],

    resolve: {
      extensions: ['.js', '.json']
    },

    optimization: {
      minimize: !isDevelopment,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          }
        }
      }
    }
  };
};