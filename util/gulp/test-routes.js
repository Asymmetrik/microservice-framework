'use strict';

/** @module core/tests/server/route/test-routes */

let through = require('through2'),
	gutil = require('gulp-util'),
	mongoose = require('mongoose'),
	q = require('q'),
	_ = require('lodash'),
	path = require('path');

/**
 * @function test
 * @static
 * @summary Test the routes.
 * @description
 * Test files are expected to have the following format (you only have to fill in the portions you want to test):
 * module.exports = {
 *     'Route Name': {
 *         'Route Type' (put, get, post, delete): [{ // an array of test objects (see example below)
 *             name: '', // what you want the test to be named. the index will be used if a name isn't provided
 *             clearDB: 0, // set this if you want the database to be wiped before this test starts
 *             setup: function(config), // can be used for setting up the database. config is passed as a parameter
 *             user: '_id', // id of the user you want to use instead of the admin
 *             body: {}, // what you want the body object to look like
 *             params: {}, // what you want the params object to look like
 *             query: {}, // what you want the query object to look like
 *             url: '', // the url string for the request
 *             paramArgs: [ // the values for the parameter middleware
 *                 '1st param value', '2nd param value'
 *             ],
 *             count: { // the expected counts of the models in the database
 *                 'model name': expected count (number)
 *             },
 *             validate: function(response, res), // return or throw the error if something isn't valid
 *                 example of the response object:
 *                     response: { // the expected response
 *                         header: '', // the header value
 *                         status: '', // the status value
 *                         property: {}, // a hash of the set properties
 *                         writeValue: '', // a string representation of the values written to the response
 *                         sentValue: {} // the object sent back by the response
 *                     },
 *             error: {}, // the expected error object
 *             skip: 0 // only set this if you don't want to test the route
 *         }]
 *     }
 * };
 */
module.exports = function(silent) {
	let totalNumberOfErrors = 0;
	let config = require('../../lib/config');
	return through.obj(function(vinylFile, encoding, next) {
		// load the file
		let util = require('../tests/test-route.server.service.js');
		let file = require(vinylFile.path);
		if (!file) {
			return next(null, vinylFile);
		}
		let fileName = vinylFile.path.substring(vinylFile.path.lastIndexOf('/') + 1);
		// load the test
		let testFile;
		try {
			let matches = /(?:app\/)+(.+)\/server\/routes\/(.+).js/g.exec(vinylFile.path);
			testFile = require(path.resolve('./app/' + matches[1] + '/tests/server/routes/' + matches[2] + '.test.js'));
		}
		catch(e) {
			gutil.log(gutil.colors.red(e));
			testFile = {};
		}
		// mock object used to gather all the information about the route
		let mockApp = {
			routeName: '',
			routes: {},
			params: {},
			route: function(path) {
				if (!testFile[path]) testFile[path] = {};
				this.routeName = path;
				return this;
			},
			put: function() {
				if (!testFile[this.routeName].put) testFile[this.routeName].get = [{}];
				return this;
			},
			get: function() {
				if (!testFile[this.routeName].get) testFile[this.routeName].get = [{}];
				return this;
			},
			post: function() {
				if (!testFile[this.routeName].post) testFile[this.routeName].post = [{}];
				return this;
			},
			'delete': function() {
				if (!testFile[this.routeName]['delete']) testFile[this.routeName]['delete'] = [{}];
				return this;
			},
			param: function() {
				return this;
			}
		};
		// allow us to step through the routes, one at a time
		let mockRoutes = function(defer, routeNameIndex, routeNames, routeTypeIndex, routeTypes) {
			// if the route doesn't have the selected routeType, just skip this
			let next = function() {
				++routeTypeIndex;
				if (routeTypeIndex === routeTypes.length) {
					routeTypeIndex = 0;
					++routeNameIndex;
				}
				if (routeNameIndex === routeNames.length) {
					defer.resolve();
				}
				else {
					mockRoutes(defer, routeNameIndex, routeNames, routeTypeIndex, routeTypes);
				}
			};
			let routeName = routeNames[routeNameIndex];
			let routeType = routeTypes[routeTypeIndex];
			if (!testFile[routeName][routeType]) return next();
			let testCounts;
			let admin;
			/**
			 * @inner
			 * @summary Clears the database and then adds an admin user
			 */
			let clearDB = function() {
				return util.clearDB().then(function() {
					testCounts = { User: 1 };
					return util.generateUser('admin').then(function(user) {
						admin = user;
					});
				});
			};
			// run the tests for the route in order
			clearDB().then(function() {
				let testPromise = q.when({});
				_.each(testFile[routeName][routeType], function(test, index) {
					// check to see if we need to run this test
					if (test.skip) return;
					let passed = 1;
					let outputError = function(errors) {
						++totalNumberOfErrors;
						passed = 0;
						let name = _.isEmpty(test) ? 'default test' : test.name || 'test #' + index;
						let message = 'Failed ' + name + ' for ' + routeName + ' (' + routeType + ') in ' + fileName + ':';
						if (_.isArray(errors)) errors.unshift(message);
						else errors = [message, errors];
						gutil.log.apply(this, _.map(errors, function(value) {
							return _.isString(value) ? gutil.colors.red(value) : value;
						}));
					};
					// make a copy of the config
					let originalConfig = {};
					_.extend(originalConfig, config);
					testPromise = testPromise.then(function() {
						// check to see if we need to wipe the db
						if (test.clearDB) return clearDB();
					}).then(function() {
						// check to see if there is a setup function we need to call
						if (test.setup) return test.setup(config);
					}).timeout(30000, 'The setup function took more than 30000 ms').fail(function(err) {
						outputError(['error encountered in the setup function', err]);
					}).then(function() {
						return util.generateRequest(test.user || admin._id);
					}).then(function(req) {
						let routeDefer = q.defer();
						if (test.body) req.body = test.body;
						if (test.params) req.params = test.params;
						if (test.query) req.query = test.query;
						if (test.url) req.url = test.url;
						if (test.app) req.app = test.app;
						if (test.user) req.user = test.user;
						if (test.get) req.get = test.get;
						if (test.accepts) req.accepts = test.accepts;
						util.testRoute(file, routeName, routeType, test.paramArgs || [], req, function(error, response) {
							_.extend(config, originalConfig);
							if (error && !_.isEqual(test.error, error)) {
								outputError(['got', silent || !error.stack ? error : new Error(error.stack), 'but expected', test.error]);
							}
							if (!error && test.error) {
								outputError(['got undefined but expected', test.error]);
							}
							q.when({}).then(function() {
								if (test.validate) {
									let cleanRes = _.transform(response, function(result, value, key) {
										if (!_.isFunction(value)) result[key] = value;
									}, {});
									return test.validate(_.cloneDeep(response.getResponse()), cleanRes);
								}
							}).then(routeDefer.resolve).fail(routeDefer.reject);
						});
						return routeDefer.promise.timeout(30000, 'The validate function took more than 30000 ms').fail(function(err) {
							outputError(['error encountered in the validate function', err]);
						}).then(function() {
							return test.count || {};
						});
					}).then(function(testCount) {
						// add the expected counts
						_.each(testCount, function(count, modelName) {
							if (!testCounts[modelName]) testCounts[modelName] = 0;
							testCounts[modelName] += count;
						});
					}).then(function() {
						// check to see if anything got inserted
						return q.allSettled(_.map(mongoose.modelNames(), function(modelName) {
							let expectedCount = testCounts[modelName] || 0;
							return q.ninvoke(mongoose.model(modelName), 'count').then(function(count) {
								if (count !== expectedCount) {
									testCounts[modelName] = count;
									outputError('got ' + count + ' but expected ' + expectedCount + ' ' + modelName);
								}
							});
						}));
					}).then(function() {
						if (!silent && passed && !_.isEmpty(test)) {
							gutil.log(gutil.colors.green('Passed ' + (test.name || 'test #' + index) + ' for ' + routeName + ' (' + routeType + ') in ' + fileName));
						}
					});
				});
				return testPromise;
			}).done(function (err) {
				next(err);
			}); // move on to the next test
		};
		// load all the information and then test the routes
		try {
			file(mockApp);
		}
		catch(err) {
			gutil.log('error encountered trying parse ' + fileName, err);
			++totalNumberOfErrors;
			next(null, vinylFile);
		}
		let routesPromise = q.defer();
		if (_.isEmpty(testFile)) {
			routesPromise.resolve();
		}
		else {
			mockRoutes(routesPromise, 0, _.map(testFile, function(routeObj, routeName) {
				return routeName;
			}), 0, ['put', 'get', 'post', 'delete']);
		}
		routesPromise.promise.fail(function(err) {
			++totalNumberOfErrors;
			gutil.log('error encountered while mocking the routes in ' + fileName, err);
		}).done(function() {
			next(null, vinylFile);
		});
	});
};