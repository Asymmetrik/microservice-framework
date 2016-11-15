'use strict';

/** @module config/lib/winston */

var config = require('../config'),
	winston = require('winston'),
	os = require('os');

/**
 * @inner
 * @summary Proxy handler to redirect fatal logs to error
 * @type {{get: handler.get}}
 */
var handler = {
	/**
	 * @summary Get meta method for logger proxy
	 * @inner
	 * @param target {object} Target object
	 * @param name {string} Parameter name
	 * @returns {*}
	 */
	get: function(target, name){
		switch(name){
			case 'warn':
				name = 'warning';
				break;
			case 'fatal':
				name = 'crit';
				break;
		}
		return target[name];
	}
};

/**
 * @summary Normal logger
 * @type {winston.Logger}
 */
module.exports.logger = new Proxy(new winston.Logger({
	level: config.log.level || 'debug',
	transports: [
		new (winston.transports.Console)({
			level: config.log.level || 'debug',
			/**
			 * @summary Define JSON format for logger, make it pretty for LogStash
			 * @inner
			 * @param options
			 */
			formatter: function(options){
				var logObj = {
					hostname: os.hostname(),
					pid: process.pid,
					level: options.level.toUpperCase(),
					time: (new Date()).toISOString(),
					timestamp: Date.now(),
					message: options.message,
					meta: options.meta
				};

				if (['development', 'test', 'development-local'].indexOf(process.env.NODE_ENV) !== -1) {
					return logObj.time+'--'+logObj.level+' - '+logObj.message+(Object.getOwnPropertyNames(logObj.meta).length > 0 ? ' | '+JSON.stringify(logObj.meta) : '');
				}
				else {
					return JSON.stringify(logObj);
				}
			}
		})
	]
}), handler);

//Set the extra levels
var levels = winston.config.syslog.levels;
levels.util = 0;
module.exports.logger.setLevels(levels);

/**
 * @summary Audit logging passes the message and the audit object as meta data
 * @type {{audit: exports.auditLogger.audit}}
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
		module.exports.logger.log('info', message, a);
	}
};