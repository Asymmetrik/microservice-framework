'use strict';

/** @module config/assets/default */

/**
 * @name exports
 * @static
 * @summary Default includes
 */
module.exports = {
	server: {
		allJS: ['gulpfile.js', 'main.js', 'run.js', 'config/**/*.js', 'lib/**/*.js', 'util/**/*.js'],
		proxyquire: ['util/tests/proxyquire/**/*.js']
	},
	tests: {
		server: ['util/tests/**/*.js']
	}
};
