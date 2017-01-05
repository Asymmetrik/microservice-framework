'use strict';

/** @module lib/services */

let _ = require('lodash'),
	path = require('path'),
	config = require('./config');

/**
 * Auto-discover all the services so we can load them easily
 */

if (_.has(config, 'files.server.services')) {
	config.files.server.services.forEach((filepath) => {

		// Get the filename and use that as the key
		let filename = path.basename(filepath, 'js').replace(/[.]server/, '');
		filename.split('.').map((part) => {
			return _.camelCase(part);
		}).join('.');

		// Export a function for each service that, when requested, lazy loads the service file
		_.set(module.exports, filename, () => {
			return require(filepath);
		});
	});
}
