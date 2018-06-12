const webpack = require('./webpack.config.js');

module.exports = (config) => {
  config.set({
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'tests.webpack.js' //just load this file
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      // add webpack as preprocessor
      'tests.webpack.js': ['webpack', 'sourcemap']
    },

    webpack: Object.assign({ mode: 'development' }, webpack('', { mode: 'development' })),

    failOnEmptyTestSuite: false,

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // middleware: ['polyfill'],
    // BUG that install everything "karma-polyfill-service": "github:sgratzl/karma-polyfill-service",
    polyfill: {
      // features: '<feature-set>', // feature set, see polyfill-service docs for details, defaults to `{default: {}}`
      // path: '<path>' // path to serve the polyfill script under, defaults to '/polyfill.js'
    },

    browsers: ['Chrome'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  });
};
