var webpack = require('webpack');
var TypedocWebpackPlugin = require('typedoc-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var pkg = require('./package.json');

var year = (new Date()).getFullYear();
var banner = '/*! '+( pkg.title || pkg.name) +' - v'+ pkg.version +' - ' + year +'\n' +
    '* '+ pkg.homepage+'\n' +
    '* Copyright (c) '+ year +' '+ pkg.author.name +';' +
    ' Licensed '+ pkg.license+'*/\n';

function generate(bundle, min) {
  var base = {
    entry: './src/bundle.js',
    output: {
      path: './dist',
      filename: 'LineUpJS' + (bundle ? '_bundle' : '') + (min ? '.min' : '') + '.js',
      library: 'LineUpJS',
      libraryTarget: 'umd',
      umdNamedDefine: false //anonymous require module
    },
    resolve: {
      alias: {
        d3: '../bower_components/d3/d3'
      }
    },
    plugins: [
      new webpack.BannerPlugin(banner, {raw: true})
      //rest depends on type
    ],
    module: {
      loaders: [
        {
          test: /\.scss$/,
          loader: 'style!css!sass'
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader'
        }
      ]
    }
  };
  if (!bundle) {
    //don't bundle d3
    base.externals = ['d3'];

    //extract the included css file to own file
    var p = new ExtractTextPlugin('style'+(min?'.min':'')+'.css');
    base.plugins.push(p);
    base.module.loaders[0].loader = p.extract(['css', 'sass']);
  }
  if (min) {
    base.plugins.push(new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false }}));
  } else {
    //generate source maps
    base.devtool = 'source-map';
  }
  if (!bundle && min) {
    //generate docu
    base.plugins.push(new TypedocWebpackPlugin({
        target: 'es5',
        module: 'commonjs', // 'amd' (default) | 'commonjs'
        output: '../docs',
        name: 'LineUp.js',

        entryPoint: 'main.LineUp',
        mode: 'modules',
        theme: 'minimal'
      }));
  }
  return base;
}

var library = generate(false, false);
var library_min = generate(false, true);

var bundle = generate(true, false);
var bundle_min = generate(true, true);

if (process.argv[2] === '--watch') { //aka called as: webpack --watch
  module.exports = library;
} else {
  module.exports = [library, library_min, bundle, bundle_min];
}
