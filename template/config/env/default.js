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

	auth: {
		strategy: 'local',

		// Session settings are required regardless of auth strategy
		sessionSecret: env.SESSION_SECRET,
		sessionCollection: 'sessions',
		sessionCookie: {
			maxAge: 60 * 60 * 24 * 1000	// 24 hours
		},
		resave: true,
		saveUninitialized: true,
		rolling: true
	},

	dateFormat: 'YYYY-MM-DD',
	siteTimezone: env.TIMEZONE // moment-timezone timezone string for the server.
};
