'use strict';

/** @namespace Router */

/**
 * Module dependencies.
 */
var logger = require('./lib/bunyan');

/**
 * Export dependencies that can be used by including modules
 */
module.exports = {
	logger:         logger.logger,
	auditLogger:    logger.auditLogger,
	config:         require('./lib/config'),
	mongoose:       require('./lib/mongoose'),
	express:        require('./lib/express'),

	csvStream:      require('./util/server/csv-stream.server.service.js'),
	date:           require('./util/server/date.server.service.js'),
	query:          require('./util/server/query.server.service.js'),
	permissions:    require('./util/server/user-permissions.server.service.js'),
	util:           require('./util/server/util.server.service.js'),

	gulp: {
		mongo:      require('./util/gulp/mongo-helpers.js'),
		testRoutes: require('./util/gulp/test-routes.js')
	}
};