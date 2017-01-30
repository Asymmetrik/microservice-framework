'use strict';

/** @module util/services/query */

const mongoose = require('mongoose'),
	_ = require('lodash'),
	q = require('q');

// Dangerous query keys: https://docs.mongodb.org/manual/faq/fundamentals/#javascript
const blacklist = ['$where', 'mapReduce', 'group'];

/**
 * @function escapeRegex
 * @summary Escape the regex string
 * @param str {string} Regex string
 * @returns {string}
 */
function escapeRegex(str) {
	return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
}

/**
 * @function generateFind
 * @summary Generate find query
 * @param query {Object} Query Object
 * @returns {Object}
 */
function generateFind(query) {
	let find;

	// If the query is non-null, add the query terms
	if(null != query){
		find = find || {};
		for(const k in query){
			find[k] = query[k];
		}
	}

	return find;
}

/**
 * @function generateSort
 * @summary Generate sort query
 * @param sortArr {Array} Sort array, give property and direction
 * @returns {Object}
 */
function generateSort(sortArr) {
	const sort = {};

	// If the sort is non-null, extract the sort instructions
	if(null != sortArr){
		sortArr.forEach(function(d){
			sort[d.property] = (d.direction === 'ASC')? 1 : -1;
		});
	}

	return sort;
}

/**
 * @function pagingQuery
 * @todo Document Parameters
 * @summary Create paging query
 * @param schema {Object} Schema object
 * @param find {Object} Find query
 * @param projection {Object}
 * @param options {Object}
 * @param sort {Object}
 * @param limit {numeric}
 * @param offset {numeric}
 * @returns {Promise}
 */
function pagingQuery(schema, find, projection, options, sort, limit, offset) {

	// Build the query
	const baseQuery = schema.find(find);
	const findQuery = schema.find(find, projection, options).sort(sort).skip(offset).limit(limit);

	// Build the promise response
	const countDefer = q.defer();
	baseQuery.count(function(error, results){
		if(null != error){
			countDefer.reject(error);
		} else {
			countDefer.resolve(results);
		}
	});
	const queryDefer = q.defer();
	findQuery.exec(function(error, results){
		if(null != error){
			queryDefer.reject(error);
		} else {
			queryDefer.resolve(results);
		}
	});

	const returnDefer = q.defer();
	q.all([countDefer.promise, queryDefer.promise]).then(function(results){
		returnDefer.resolve({ count: results[0], results: results[1] });
	}, function(error){
		returnDefer.reject(error);
	});

	return returnDefer.promise;
}

/**
 * @summary Generic contains regex search
 * @todo Document Parameters
 * @param schema {Object}
 * @param query {Object}
 * @param fields {Object}
 * @param search {Object}
 * @param limit {numeric}
 * @param offset {numeric}
 * @param sortArr {Array}
 * @returns {Promise}
 */
module.exports.containsQuery = function(schema, query, fields, search, limit, offset, sortArr) {
	// Initialize find to null
	let find = generateFind(query);
	const projection = {};
	const options = {};
	const sort = generateSort(sortArr);

	// Build the find
	if(null != search && '' !== search) {
		find = find || {};

		if(null != fields && fields.length > 1) {
			find.$or = [];

			fields.forEach(function(element){
				const constraint = {};
				constraint[element] = { $regex: new RegExp(escapeRegex(search), 'gim') };

				find.$or.push(constraint);
			});
		}
	}

	return pagingQuery(schema, find, projection, options, sort, limit, offset);
};

/**
 * @summary Generic Full text search
 * @todo Document parameters
 * @param schema {Object}
 * @param query {Object}
 * @param searchTerms {Object}
 * @param limit {numeric}
 * @param offset {numeric}
 * @param sortArr {Array}
 * @returns {Promise}
 */
module.exports.search = function(schema, query, searchTerms, limit, offset, sortArr) {
	// Initialize find to null
	let find = generateFind(query);
	// NOTE: Why does this variable exist?
	let projection;
	const options = {};
	const sort = generateSort(sortArr);


	// If the searchTerms is non-null, then build the text search
	if(null != searchTerms && '' !== searchTerms){
		find = find || {};
		find.$text = { $search: searchTerms };

		projection = projection || {};
		projection.score = { $meta: 'textScore' };

		// Sort by textScore last if there is a searchTerms
		sort.score = { $meta: 'textScore' };
	}

	return pagingQuery(schema, find, projection, options, sort, limit, offset);
};

/**
 * @summary Format query parameter
 * @param param {string|number|Object} Parameter to format
 * @returns {Object|string|number}
 */
module.exports.formatQueryParam = function(param) {
	if (typeof param === 'string' || typeof param === 'number' || typeof param === 'boolean') {
		return param;
	}
	else if (_.isArray(param)) {
		param = _.map(param, function(p) {
			return module.exports.formatQueryParam(p);
		});
		param = _.reject(param, _.isNull);
	}
	else if (typeof param === 'object' && param) {
		if (!param.dataType) {
			_.each(param, function(value, key) {

				const val = module.exports.formatQueryParam(value);
				if (_.indexOf(blacklist, key) === -1 && val !== null) {
					param[key] = val;
				}
				else {
					delete param[key];
					if (Object.keys(param).length === 0) {
						param = null;
					}
				}
			});
		}
		else if (param.dataType === 'ObjectId') {
			delete param.type;
			return mongoose.Types.ObjectId(param.value);
		}
		else if(param.dataType === 'date') {
			param = new Date(param.value);
			if ( isNaN(param.getTime() )) {
				throw new Error('Invalid Date');
			}
		}
		else if(param.dataType === 'regex') {
			// Adds double backslashes before all special characters
			let str = param.value.replace(/[!@#$%^&*()+=\-[\]\\';,./{}|":<>?~_]/g, '\\$&');

			if (param.regexRule === 'startsWith') {
				str = '^' + str;
			}
			param = new RegExp(str);
		}
		else {
			param = null;
		}
	}
	else {
		param = null;
	}
	return param;
};