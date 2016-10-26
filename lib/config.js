'use strict';

/** @module config/config */

/**
 * Module dependencies.
 */
var _ = require('lodash'),
	chalk = require('chalk'),
	glob = require('glob'),
	q = require('q'),
	path = require('path');

/**
 * @summary Get files by glob patterns
 * @param globPatterns {
 * @param excludes
 */
function getGlobbedPaths (globPatterns, excludes) {
	// URL paths regex
	var urlRegex = new RegExp('^(?:[a-z]+:)?\/\/', 'i');

	// The output array
	var output = [];

	// If glob pattern is array so we use each pattern in a recursive way, otherwise we use glob
	if (_.isArray(globPatterns)) {
		globPatterns.forEach(function(globPattern) {
			output = _.union(output, getGlobbedPaths(globPattern, excludes));
		});
	}
	else if (_.isString(globPatterns)) {
		if (urlRegex.test(globPatterns)) {
			output.push(globPatterns);
		}
		else {
			var files = glob.sync(globPatterns);

			if (excludes) {
				files = files.map(function(file) {
					if (_.isArray(excludes)) {
						for (var i in excludes) {
							file = file.replace(excludes[i], '');
						}
					}
					else {
						file = file.replace(excludes, '');
					}
					return file;
				});
			}
			output = _.union(output, files);
		}
	}
	return output;
}

/**
 * @summary Load a config file if it exists, or return an empty object if the file doesn't exist
 * @param filepath {String}
 * @returns {Object}
 */
function loadConfigFile(filepath) {
	try {
		return require(filepath);
	}
	catch (err) {
		// Ignore
	}
	return null;
}



/**
 * @summary Validate NODE_ENV existance
 */
function validateEnvironmentVariable () {
	if (null == process.env.NODE_ENV) {
		process.env.NODE_ENV = 'development';

		// Using console.log because this stuff happens before the environment is configured yet
		console.log('NODE_ENV not set, using default environment: "development" instead.');
	}
	// Suppress this log message on production
	else if (process.env.NODE_ENV !== 'production') {
		console.log('NODE_ENV is set to: "' + process.env.NODE_ENV + '"');
	}
}

/**
 * @summary Read and merge the application config files
 * @returns {Object} The merged config file
 */
function initConfig () {
	var config = {};
	var env = process.env.NODE_ENV;

	var files = [
		// Load the default config from the host service
		path.resolve('./config/env/default'),

		// Load the environment-specific config from the host service
		env != 'default' ? path.resolve('./config/env/' + env) : null
	];
	var fileIsEmpty = [];

	// Load and merge each file
	files.forEach(function(file, i) {
		if (file) {
			var loaded = loadConfigFile(file);
			if (!loaded) {
				fileIsEmpty[i] = true;
			}
			else {
				config = _.extend(config, loaded);
			}
		}
	});

	// Make sure there is an application-specific config
	if (fileIsEmpty[files.length - 1] ) {
		console.log(chalk.red('No configuration files found matching environment: "' + process.env.NODE_ENV + '"'));
		// Reset console color
		console.log(chalk.white(''));
		process.exit(1);
	}
	return config;
}

function initAssets (config) {
	var assets = {};

	// Determine the deployment mode (defaults to 'development')
	var mode = (null != config.assets) ? config.assets : 'default';

	var files = [
		// Load the default assets from the host service
		path.resolve('./config/assets/default'),

		// Load the specified assets override from the host service
		mode != 'default' ? path.resolve('./config/assets/', mode) : null
	];

	var fileIsEmpty = [];

	// Load and merge each file
	files.forEach(function(file, i) {
		if (file) {
			var loaded = loadConfigFile(file);
			if (!loaded) {
				fileIsEmpty[i] = true;
			}
			else {
				assets = _.extend(assets, loaded);
			}
		}
	});

	// Make sure there in a mode-specific config (otherwise, why did you set the mode?)
	if (fileIsEmpty[files.length - 1]) {

	}
	return assets;
}



/**
 * @summary Initialize global configuration files
 * @param config {Object} Configuration object
 * @param assets {Object} Assets object
 */
function initGlobalConfigFiles (config, assets) {
	// Appending files
	config.files = {
		server: {},
		tests: {}
	};

	// Loop through all the defined assets and expand their globs
	Object.keys(config.files).forEach(function(section) {
		if (assets[section]) {
			_.forEach(assets[section], function(patterns, key) {
				config.files[section][key] = getGlobbedPaths(patterns);
			});
		}
	});
}



/**
 * @summary Initialize global configuration
 * @returns {Object}
 */
function init () {

	// Validate NODE_ENV existence
	validateEnvironmentVariable();

	// Load the config
	var config = initConfig();

	// Load the assets
	var assets = initAssets(config);

	// Initialize global globbed files
	initGlobalConfigFiles(config, assets);

	// Store the original assets in the config
	config.assetGlobs = assets;

	// Expose configuration utilities
	config.utils = {
		getGlobbedPaths: getGlobbedPaths
	};

	return config;
}

/**
 * @name config
 * @summary Initialize application
 * @type {Object}
 */
module.exports = init();
