'use strict';

/** @module config/env/default */

var year = 1900 + (new Date()).getYear();

/**
 * @name exports
 * @static
 * @summary Default environment
 */
module.exports = {
	log: {
		level: 'debug'
	},

	// Ports for development applications
	devPorts: {
		nodeInspector: 1337,
		debug: 5858
	},

	mongoose: {
		debug: true
	}
};
