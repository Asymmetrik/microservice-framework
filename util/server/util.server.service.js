'use strict';

/** @module util/services/util */

var mongoose = require('mongoose'),
	path = require('path'),
	_ = require('lodash'),
	q = require('q'),
	moment = require('moment-timezone'),
	config = require('../../lib/config');

/**
 * @summary Catch any errors otherwise execute callback
 * @param res {Response} Request object
 * @param err {Object} Error object
 * @param callback {Function} Callback
 */
exports.catchError = function(res, err, callback) {
	if (err) {
		return this.send400Error(res, err);
	}
	else if (null != callback) {
		callback();
	}
};

/**
 * @summary Simplify errors
 * @param err {Object} Error object
 */
exports.simplifyErrors = function(err) {
	var errors = _.isArray(err.errors) ? err.errors : [err.errors];
	return _.chain(errors)
		.map(function(error) {
			return _.map(error, function(value, key) {
				return value;
			});
		})
		.flattenDeep()
		.value();
};

/**
 * @summary Get error details into HTML string
 * @param err {Object}
 * @returns {string}
 */
exports.getErrorDetails = function(err) {
	return _.chain(err)
		.map(function(err) {
			return err.errorTag ? err.errorTag + ': ' + err.message : err.message;
		})
		.uniq()
		.value()
		.join('<br/>');
};

/**
 * @summary Send 400 Error
 * @param res {Request} Response Object
 * @param err {Object} Error object
 * @returns {Response}
 */
exports.send400Error = function (res, err) {

	// Redirect calls intended for sendSimple400Error
	if (_.isString(err)) {
		return exports.sendSimple400Error(res, err);
	}

	var simpleErrors = exports.simplifyErrors(err);
	return res.status(400).send({
		message: err.message,
		detail: exports.getErrorDetails(simpleErrors),
		error: simpleErrors,
		title: 'Error' + (res.title && res.title.fail ? ' ' + res.title.fail : '')
	});
};

/**
 * @summary Send 400 Error
 * @param res {Request} Response Object
 * @param errorMessage {String} Error message
 * @returns {Response}
 */
exports.sendSimple400Error = function(res, errorMessage) {
	return res.status(400).send({
		message: errorMessage
	});
};

/**
 * @summary Send 403 error
 * @param res {Request} Response Object
 * @param err {Object} Error object
 * @returns {Response}
 */
exports.send403Error = function (res) {
	return res.status(403).send({
		message: 'User is not authorized'
	});
};

/**
 * Custom Validation Methods
 */


/**
 * @summary ValidateEmptyOr
 * @todo Document parameter type
 * @param orFunction {} Function to check if value is not empty.
 */
exports.validateEmptyOr = function(orFunction) {
	return function(property, callback) {
		if (property === null || property === undefined) {
			callback(true);
		}
		else {
			callback(orFunction(property));
		}
	};
};

/**
 * @summary Validate greater than zero
 * @param property {*} Property to check
 * @returns {boolean}
 */
exports.validateGreaterThanZero = function(property) {
	return property > 0;
};

/**
 * @summary Validate property isn't empty
 * @param property {*} Property to check
 * @returns {boolean}
 */
exports.validateNonEmpty = function(property) {
	return (null != property && property.length > 0);
};

/**
 * @summary Validate field for model is unique
 * @param modelName {string} Mongoose model name
 * @param field {string} field name
 * @returns {Function}
 */
exports.validateIsUnique = function(modelName, field) {
	return function(property, callback) {
		// Assumes that unique fields must also be non empty. Otherwise, you will get "unique" errors on
		// save if there are multiple models with a blank field.
		if (!exports.validateNonEmpty(property)) {
			return callback(false);
		}

		// Build query
		var find = {};
		find[field] = property;
		find._id = {$ne: this._id};

		return mongoose.model(modelName).findOne(find).exec(function(err, result) {
			if (err) return callback(false);
			callback(!result);
		});
	};
};

/**
 * @summary Cast array of strings to mongo ObjectIds
 * @param array {Array} array[String]
 * @returns array of objectIds.
 */
exports.castToIDs = function(array){
	var ret = [];
	_.each(array, function(string){
		if (mongoose.Types.ObjectId.isValid(string)) {
			ret.push(mongoose.Types.ObjectId(string));
		}
	});
	return ret;
};

/**
 * @summary Parse date into Date object
 * @param date {string} Date string
 * @returns {Date}
 */
exports.dateParse = function(date) {
	if (!date) {
		return null;
	}
	return Date.parse(date);
};

/**
 * @function stripString
 * @static
 * @summary Remove all non alphanumeric characters from a string.
 * @param string {string} String to manipulate
 * @returns {string}
 */
exports.stripString = function(string) {
	return string.replace(/[^a-zA-Z0-9]/g, '');
};

/**
 * @function stripProtocol
 * @static
 * @summary Remove protocol from a url
 * @param string {string} String to manipulate
 * @returns {string}
 */
exports.stripProtocol = function(string) {
	return string.replace(/^https?\:\/\//g, '').replace(/^www\./i, '');
};

/**
 * @function generateCleanRegex
 * @summary convert all special characters so they have \\ before them, then returns a regex. This allows searching by special characters safely.
 * @param phrase {string} regex
 * @returns {RegExp}
 */
exports.generateCleanRegex = function(phrase) {
	//replace special characters with escaped special characters
	if (!phrase) phrase = '';
	var cleanPhrase = phrase.replace(/[!@#$%^&*()+=\-[\]\\';,./{}|":<>?~_]/g, '\\$&');
	return new RegExp(cleanPhrase, 'i');
};

/**
 * @function generateNumberRegex
 * @summary convert all special characters so they have \\ before them, then returns a regex. This allows searching by special characters safely.
 * @param phrase {string} regex
 * @returns {RegExp}
 */
exports.generateNumberRegex = function(phrase) {
	//replace special characters with escaped special characters
	if (!phrase) phrase = '';
	var cleanPhrase = phrase.replace(/[^0-9]/g, '');
	return cleanPhrase ? new RegExp(cleanPhrase, 'i') : null;
};

/**
 * @summary If we don't yet have a slug, generate one based on the name.
 * @param model {mongoose.Model} Mongoose model
 * @returns {mongoose.Model} The model, with a slug added if necessary.
 */
exports.generateSlug = function(model) {
	var generatedSlug = false;
	if (model.name && !model.slug) {
		generatedSlug = true;
		model.slug = model.name;
	}
	// Make sure the slug is in the proper format
	if (model.slug) {
		model.slug = model.slug.toLowerCase().replace(/\W/g, '_');
	}
	if (generatedSlug) {
		model.slug = model.slug.toLowerCase().replace(/_+/g, '_');
	}
	return model;
};

/**
 * @summary If we don't yet have a slug, generate one based on the name.
 * @param model {mongoose.Model} Mongoose model
 * @returns {mongoose.Model} The model, with a slug added if necessary.
 */
exports.formatDate = function(value) {
	if (value && value instanceof Date) {
		return moment(value).tz(config.siteTimezone).format('YYYY-MM-DD HH:mm:ss (z)');
	}
	return value;
};