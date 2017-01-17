'use strict';

/** @namespace Router */

/**
 * Module dependencies.
 */
var logger = require('./lib/logger');

/**
 * Export dependencies that can be used by including modules
 */
module.exports = {
	logger:         logger.logger,
	auditLogger:    logger.auditLogger,
	config:         require('./lib/config'),
	mongoose:       require('./lib/mongoose'),
	express:        require('./lib/express'),
	file:           require('./lib/file'),

	csvStream:      require('./util/server/services/csv-stream.server.service.js'),
	date:           require('./util/server/services/date.server.service.js'),
	query:          require('./util/server/services/query.server.service.js'),
	util:           require('./util/server/services/util.server.service.js'),
	getRoutes:      require('./util/server/services/get-routes.server.service.js'),
	moxiequire:     require('./util/server/services/moxiequire.server.service.js'),
	gulp: {
		mongo:      require('./util/gulp/mongo-helpers.js'),
		testRoutes: require('./util/gulp/test-routes.js')
	}
};