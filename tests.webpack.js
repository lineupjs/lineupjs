/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

require('jasmine-promises');
/**
 * find all tests in the spec directory and load them
 */
var context = require.context('./tests', true, /\.test\.ts$/); //make sure you have your directory and regex test set correctly!
context.keys().forEach(context);
