'use strict';

/** @module util/services/date */

var moment = require('moment'),
	config = require('../../lib/config');

/**
 * parseDate
 * @summary Parses date string into date object
 * @param dateString {string} Date string
 * @returns {Date}
 */
exports.parseDate = function(dateString) {
	try {
		var newDate = moment(dateString);
		if ( newDate == null || newDate === 'Invalid Date' ) {
			newDate = new Date();
		}
		return newDate;
	}
	catch(e) {
		return new Date();
	}
};

/**
 * formatDate
 * @summary Formats date to YYYY-MM-DD format
 * @param date {Date} Date object
 * @return {string}
 */
exports.formatDate = function(date) {
	return moment(date).format(config.dateFormat || 'YYYY-mm-dd');
};