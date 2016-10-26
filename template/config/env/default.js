'use strict';

/** @module config/env/default */

var year = 1900 + (new Date()).getYear();

/**
 * @name exports
 * @static
 * @summary Default environment
 */
module.exports = {
	port: process.env.PORT || 3000,
	assets: 'default',

	log: {
		level: 'info'
	},

	mongoose: {
		debug: false
	},

	auth: {
		strategy: 'local',

		// header setting is only required for proxy-pki
		//strategy: 'proxy-pki',
		//header: 'x-ssl-client-s-dn',

		// Session settings are required regardless of auth strategy
		sessionSecret: 'some-secret',
		sessionCollection: 'sessions',
		sessionCookie: {
			maxAge: 60 * 60 * 24 * 1000	// 24 hours
		}

	},

	dateFormat: 'YYYY-MM-DD',
	siteTimezone: 'America/New_York' // moment-timezone timezone string for the server.
};
