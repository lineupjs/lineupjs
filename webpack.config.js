/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

const resolve = require('path').resolve;
const pkg = require('./package.json');
const webpack = require('webpack');
const fs = require('fs');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const now = new Date();
const prefix = (n) => n < 10 ? ('0' + n) : n.toString();
const buildId = `${now.getUTCFullYear()}${prefix(now.getUTCMonth() + 1)}${prefix(now.getUTCDate())}-${prefix(now.getUTCHours())}${prefix(now.getUTCMinutes())}${prefix(now.getUTCSeconds())}`;
pkg.version = pkg.version.replace('SNAPSHOT', buildId);

const year = (new Date()).getFullYear();
const banner = '/*! ' + (pkg.title || pkg.name) + ' - v' + pkg.version + ' - ' + year + '\n' +
  (pkg.homepage ? '* ' + pkg.homepage + '\n' : '') +
  '* Copyright (c) ' + year + ' ' + pkg.author.name + ';' +
  ' Licensed ' + pkg.license + '*/\n';


//list of loaders and their mappings
const webpackloaders = [
  {test: /\.scss$/, loader: 'style-loader!css-loader!sass-loader'},
  {test: /\.tsx?$/, loader: 'awesome-typescript-loader'},
  {test: /\.json$/, loader: 'json-loader'},
  {
    test: /\.(png|jpg)$/,
    loader: 'url-loader',
    query: {
      limit: 10000 //inline <= 10kb
    }
  },
  {
    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'url-loader',
    query: {
      limit: 10000, //inline <= 10kb
      mimetype: 'application/font-woff'
    }
  },
  {
    test: /\.svg(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'url-loader',
    query: {
      limit: 10000, //inline <= 10kb
      mimetype: 'image/svg+xml'
    }
  },
  {test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader'}
];

// use workspace registry file if available
const isWorkspaceContext = fs.existsSync(resolve(__dirname, '..', 'phovea_registry.js'));

/**
 * generate a webpack configuration
 */
function generateWebpack(bundle, options) {
  const base = {
    entry: {
      'LineUpJS': './src/index.ts',
      'TaggleJS': './src/taggle.ts',
    },
    output: {
      path: resolve(__dirname, 'build'),
      filename: `[name]${bundle ? '_bundle' : ''}${options.min && !options.nosuffix ? '.min' : ''}.js`,
      chunkFilename: '[chunkhash].js',
      publicPath: '', //no public path = relative
      library: 'LineUpJS',
      libraryTarget: 'umd',
      umdNamedDefine: false //anonymous require module
    },
    resolve: {
      // Add `.ts` and `.tsx` as a resolvable extension.
      extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
      alias: {
        d3: 'd3/d3'
      },
      symlinks: false,
      //fallback to the directory above if they are siblings just in the workspace context
      modules: isWorkspaceContext ? [
        resolve(__dirname, '../'),
        'node_modules'
      ]: ['node_modules']
    },
    plugins: [
      //define magic constants that are replaced
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(options.isProduction ? 'production': 'development'),
        __VERSION__: JSON.stringify(pkg.version),
        __LICENSE__: JSON.stringify(pkg.license),
        __BUILD_ID__: buildId,
        __DEBUG__: options.isDev || options.isTest,
        __TEST__: options.isTest,
        __PRODUCTION__: options.isProduction,
        __APP_CONTEXT__: JSON.stringify('/')
      })
      //rest depends on type
    ],
    externals: {},
    module: {
      loaders: webpackloaders.slice()
    },
    devServer: {
      contentBase: resolve(__dirname, 'build'),
      watchOptions: {
        aggregateTimeout: 500,
        ignored: /node_modules/
      }
    },
    watchOptions: {
      aggregateTimeout: 500,
      ignored: /node_modules/
    }
  };
  if (!bundle) {
    //don't bundle d3
    base.externals.d3 = 'd3';
  }

  if (options.isProduction) {
      base.plugins.unshift(new webpack.BannerPlugin({
        banner: banner,
        raw: true
      }));
      base.plugins.push(new webpack.optimize.MinChunkSizePlugin({
        minChunkSize: 10000 //at least 10.000 characters
      }),
      new webpack.optimize.AggressiveMergingPlugin());
  }

  if (!options.isTest && !bundle) {
    //extract the included css file to own file
    let p = new ExtractTextPlugin({
      filename: `[name]${options.min && !options.nosuffix ? '.min' : ''}.css`,
      allChunks: true // there seems to be a bug in dynamically loaded chunk styles are not loaded, workaround: extract all styles from all chunks
    });
    base.plugins.push(p);
    base.module.loaders[0] = {
      test: /\.scss$/,
      loader: p.extract(['css-loader', 'sass-loader'])
    };
  }
  if (options.min) {
    //use a minifier
    base.plugins.push(
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false
      }),
      new UglifyJsPlugin({
        uglifyOptions: {
          ecma: 6,
          mange: true,
          compress: true,
          warnings: true
        },
        extractComments: false
      }));
  } else {
    //generate source maps
    base.devtool = 'source-map';
  }
  return base;
}

function generateWebpackConfig(env) {
  const isTest = env === 'test';
  const isProduction = env === 'prod';
  const isDev = !isProduction && !isTest;

  const base = {
    isProduction: isProduction,
    isDev: isDev,
    isTest: isTest
  };

  if (isTest) {
    return generateWebpack(false, base);
  }

  //single generation
  if (isDev) {
    return generateWebpack(false, base);
  } else { //isProduction
    return [
      //plain
      generateWebpack(false, base),
      //minified
      generateWebpack(false, Object.assign({}, base, {
        min: true
      })),
      //plain
      generateWebpack(true, base),
      //minified
      generateWebpack(true, Object.assign({}, base, {
        min: true
      }))
    ];
  }
}

module.exports = generateWebpackConfig;
module.exports.generateWebpack = generateWebpack;
