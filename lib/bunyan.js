'use strict';

/** @module config/lib/bunyan */

var config = require('./config'),
	bunyan = require('bunyan');

/**
 * @inner
 * @summary Return object that describes std out
 * @returns {{level: string, stream: StreamMock}}
 */
function stdoutStream() {
	return {
		level: config.log.level || 'debug',
		stream: process.stdout
	};
}

/**
 * @inner
 * @summary Returns an array of streams based on log levels
 * @returns {Array.<Stream>}
 */
function streams() {
	var strs = [stdoutStream()];

	if (null != config.log && null != config.log.application) {
		var appLog = config.log.application;

		//add log file if configured
		if (null != appLog.file) {
			console.log('Configuring logger to use file: ' + appLog.file);

			strs.push({
				type: 'rotating-file',
				level: 'info',
				path: appLog.file,
				period: '1d',	// daily rotation
				count: 4		// keep 3 back copies
			});
		}
	}

	return strs;
}

/**
 * @inner
 * @summary Return array of audit streams
 * @returns {Array.<Stream>}
 */
function auditStreams() {
	var strs = [stdoutStream()];

	if (null != config.log && null != config.log.audit) {
		var auditLog = config.log.audit;

		if (null != auditLog.file) {
			console.log('Configuring audit logger to use file: ' + auditLog.file);

			strs.push({
				type: 'rotating-file',
				level: 'info',
				path: auditLog.file,
				period: '1d',	// Rotation period
				count: 4		// Number of files to keep
			});
		}

		if (null != auditLog.logstash) {
			strs.push({
				type: 'raw',
				level: 'info',
				stream: logstash.createStream({
					host: auditLog.logstash.host,
					port: auditLog.logstash.port
				})
			});
		}
	}

	return strs;
}

/**
 * @summary Request serializer
 * @param req {Object]
 * @returns {Request}
 */
function reqSerializer(req) {
	var output = bunyan.stdSerializers.req(req);
	if(null != req && null != req.session && null != req.session.passport) {
		output.user = req.session.passport.user;
	}

	return output;
}

/**
 * @type bunyan.logger
 */
var logger = bunyan.createLogger({
	name: config.serviceName || 'microservice',
	streams: streams(),
	serializers: {
		req: reqSerializer,
		err: bunyan.stdSerializers.err
	}
});

/**
 * @type bunyan.logger
 */
var auditLogger = bunyan.createLogger({
	name: 'audit',
	streams: auditStreams(),
	serializers: {
		req: reqSerializer,
		err: bunyan.stdSerializers.err
	}
});

/**
 * @name logger
 * @summary General purpose logger
 * @static
 * @type {bunyan.logger}
 */
module.exports.logger = logger;

/**
 * @name auditLogger
 * @summary Standardize logging for audit log
 * @static
 * @type {Object}
 */
module.exports.auditLogger = {
	audit: function(message, eventType, eventAction, eventActor, eventObject) {
		var a = { 
			audit: { 
				type: eventType,
				action: eventAction,
				actor: eventActor,
				object: eventObject
			}
		};
	
		auditLogger.info(a, message);
	}
};
