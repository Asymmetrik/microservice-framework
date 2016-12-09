'use strict';

/** @namespace Router */

/**
 * Module dependencies.
 */
var path = require('path'),
	msf = require('microservice-framework');

msf.logger.info('Starting initialization of Node.js server');

// Initialize mongoose
msf.mongoose.connect().then(function (db) {
	msf.logger.info('Mongoose connected, proceeding with application configuration');

	// Initialize express
	var app = msf.express.init({});

	// Start the app by listening on <port>
	app.listen(msf.config.port);

	// Logging initialization
	msf.logger.info('Node app listening on port ' + msf.config.port);

}).catch(function(err){
	msf.logger.fatal({err: err}, 'Express initialization failed.');
	process.exit(1);
});
