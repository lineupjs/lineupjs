
require('jasmine-promises');
/**
 * find all tests in the spec directory and load them
 */
var context = require.context('./tests', true, /\.test\.ts$/); //make sure you have your directory and regex test set correctly!
context.keys().forEach(context);
