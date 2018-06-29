const resolve = require('path').resolve;
const pkg = require('./package.json');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const now = new Date();
const prefix = (n) => n < 10 ? ('0' + n) : n.toString();
const buildId = `${now.getUTCFullYear()}${prefix(now.getUTCMonth() + 1)}${prefix(now.getUTCDate())}-${prefix(now.getUTCHours())}${prefix(now.getUTCMinutes())}${prefix(now.getUTCSeconds())}`;
pkg.version = pkg.version.replace('SNAPSHOT', buildId);

const year = (new Date()).getFullYear();
const banner = '/*! ' + (pkg.title || pkg.name) + ' - v' + pkg.version + ' - ' + year + '\n' +
  (pkg.homepage ? '* ' + pkg.homepage + '\n' : '') +
  '* Copyright (c) ' + year + ' ' + pkg.author.name + ';' +
  ' Licensed ' + pkg.license + '*/\n';

/**
 * generate a webpack configuration
 */
module.exports = (env, options) => {
  const dev = options.mode.startsWith('d');
  return {
    node: false, // no polyfills
    entry: {
      'LineUpJS': './src/index.ts'
    },
    output: {
      path: resolve(__dirname, 'build'),
      filename: `[name].js`,
      chunkFilename: '[chunkhash].js',
      publicPath: '', //no public path = relative
      library: 'LineUpJS',
      libraryTarget: 'umd',
      umdNamedDefine: false //anonymous require module
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      symlinks: false
    },
    plugins: [
      new webpack.BannerPlugin({
        banner: banner,
        raw: true
      }),
      //define magic constants that are replaced
      new webpack.DefinePlugin({
        __DEBUG__ : dev,
        __VERSION__: JSON.stringify(pkg.version),
        __LICENSE__: JSON.stringify(pkg.license),
        __BUILD_ID__: JSON.stringify(buildId)
      }),
      new ExtractTextPlugin({
        filename: `[name].css`
      }),
      new ForkTsCheckerWebpackPlugin({
        checkSyntacticErrors: true
      })
    ],
    externals: {},
    module: {
      rules: [{
          test: /\.s?css$/,
          use: ExtractTextPlugin.extract({
            fallback: 'style-loader',
            use: ['css-loader', 'sass-loader']
          })
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [{
              loader: 'cache-loader'
            },
            {
              loader: 'thread-loader',
              options: {
                // there should be 1 cpu for the fork-ts-checker-webpack-plugin
                workers: require('os').cpus().length - 1,
              },
            },
            {
              loader: 'ts-loader',
              options: {
                configFile: dev ? 'tsconfig_dev.json' : 'tsconfig.json',
                happyPackMode: true // IMPORTANT! use happyPackMode mode to speed-up  compilation and reduce errors reported to webpack
              }
            }
          ].slice(process.env.CI || !dev ? 2 : 0) // no optimizations for CIs and in production mode
        },
        {
          test: /\.(png|jpg)$/,
          loader: 'url-loader',
          options: {
            limit: 20000 //inline <= 10kb
          }
        },
        {
          test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: 'url-loader',
          options: {
            limit: 20000, //inline <= 20kb
            mimetype: 'application/font-woff'
          }
        },
        {
          test: /\.svg(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: 'url-loader',
          options: {
            limit: 10000, //inline <= 10kb
            mimetype: 'image/svg+xml'
          }
        },
        {
          test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: 'file-loader'
        }
      ]
    },
    watchOptions: {
      // ignored: /node_modules/
    },
    devServer: {
      contentBase: 'demo'
    }
  };
};
