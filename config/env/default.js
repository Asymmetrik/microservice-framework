'use strict';

/** @module config/env/default */

var env = require('var');

/**
 * @name exports
 * @static
 * @summary Default environment
 */
module.exports = {
	port: env.PORT,
	assets: 'default',
	log: {
		level: env.LOG_LEVEL
	},

	mongoose: {
		debug: false
	},
	db: 'mongodb://' + env.MONGO_HOST + '/' + env.MONGO_DATABASE,

	dateFormat: 'YYYY-MM-DD',
	siteTimezone: env.TIMEZONE // moment-timezone timezone string for the server.
};
