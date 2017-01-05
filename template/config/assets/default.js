'use strict';

/** @module config/assets/default */

/**
 * @name exports
 * @static
 * @summary Default includes
 */
module.exports = {
	server: {
		allJS: ['gulpfile.js', 'server.js', 'config/**/*.js', 'app/*/server/**/*.js'],
		models: 'app/*/server/models/**/*.js',
		routes: 'app/*/server/routes/**/*.js',
		config: 'app/*/server/config/*.js',
		services: 'app/*/server/services/**/*.js'
	},
	tests: {
		server: ['app/*/tests/server/**/*.js'],
		e2e: ['app/*/tests/e2e/**/*.js'],
		routes: ['app/*/server/routes/*.server.routes.js']
	}
};
