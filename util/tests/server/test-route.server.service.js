'use strict';

/** @module util/services/test-route */


const q = require('q'),
	_ = require('lodash'),
	mongoose = require('mongoose'),
	User = _.indexOf(mongoose.modelNames(), 'User') > -1 ? mongoose.model('User') : null,
	defaultUser = {
		name: 'user',
		email: 'user@example.com',
		username: 'user-' + Date.now(),
		password: 'password',
		provider: 'local',
		roles: {}
	};

/**
 * @summary Generate an empty request object
 * @param userId {String} (Optional) The id of the user you want to run as
 * @returns {Promise} A promise that resolves with the generated request object
 */
exports.generateRequest = function(userId) {
	let returnObject = (user) => {
		return {
			body: {},
			params: {},
			query: {},
			session: {},
			isAuthenticated: function() { return this.user !== null; },
			user: user,
			logout: function() {},
			header: function() { return this; },
			headers: {
				host: {}
			},
			on: function() {},
			url: ''
		};
	};
	// Not every project will have a User model
	if (User === null) {
		return exports.generateUser().then(returnObject);
	}
	return q.ninvoke(User, 'findOne', {_id: userId}).then(returnObject);
};

/**
 * @summary Generate a new user with the given role
 * @param role {String} (Optional) The desired role for the user
 * @returns {Promise} A promise that resolves with the new user
 */
exports.generateUser = function(role) {
	if (User === null) {
		return q(defaultUser);
	}

	let user = new User(defaultUser);
	if (role) {
		user.roles.user = true;
		user.roles[role] = true;
	}
	return q.ninvoke(user, 'save').then(function() {
		return user;
	});
};

/**
 * @summary Clears the database of all data
 * @returns {Promise} A promise that resolves when everything has been removed from the database
 */
exports.clearDB = function() {
	return q.allSettled(_.map(mongoose.modelNames(), function(modelName) {
		return mongoose.model(modelName).remove().exec();
	}));
};

/**
 * @summary Tests a route and calls the provided call back when finished
 * @param routeFileObject {Object} The file object for the route
 * @param routeName {String} The name of the route
 * @param routeType {String} The type of route (get, put, delete, post)
 * @param paramValues {Array} Array of parameter values for the route
 * @param req {Object} The request object you want to use
 * @param callback {Function} The callback function. Should take up to 2 parameters: error and responseObject
 *        In the response object, the getResponse function will return something like the following:
 *            {
 *                header: '', // the header value
 *                status: '', // the status value
 *                property: {}, // a hash of the set properties
 *                writeValue: '', // a string representation of the values written to the response
 *                sentValue: {} // the object sent back by the response
 *            }
 */
exports.testRoute = function(routeFileObject, routeName, routeType, paramValues, req, callback) {
	// mock object used to gather all the information about the route
	let mockApp = {
		routeName: '',
		routes: {},
		params: {},
		route: function(path) {
			if (!this.routes[path]) this.routes[path] = {};
			this.routeName = path;
			return this;
		},
		put: function() {
			if (this.routes[this.routeName].put) throw new Error(this.routeName + ' has more than one put route');
			this.routes[this.routeName].put = arguments;
			return this;
		},
		get: function() {
			if (this.routes[this.routeName].get) throw new Error(this.routeName + ' has more than one get route');
			this.routes[this.routeName].get = arguments;
			return this;
		},
		post: function() {
			if (this.routes[this.routeName].post) throw new Error(this.routeName + ' has more than one post route');
			this.routes[this.routeName].post = arguments;
			return this;
		},
		'delete': function() {
			if (this.routes[this.routeName]['delete']) throw new Error(this.routeName + ' has more than one delete route');
			this.routes[this.routeName]['delete'] = arguments;
			return this;
		},
		param: function() {
			if (this.params[arguments['0']]) throw new Error('param ' + arguments['0'] + ' is defined more than once');
			this.params[arguments['0']] = arguments;
			return this;
		}
	};
	/**
	 * @inner
	 * @summary Simulates express routing functionality
	 * @param defer {Promise} The promise to resolve once all the functions have been called for the route
	 * @param req {Object} The request object
	 * @param res {Object} The response object
	 * @param index {Integer} The index for the function we need to call
	 * @param functions {Array} The array of functions for the route
	 * @param err {Object} The error object
	 */
	let mockRoute = function(defer, req, res, index, functions, err) {
		if (err) return defer.reject(err);
		if (!functions[index]) return defer.reject(new Error('next called at the end of the route'));
		let responseSent = function(resp) {
			if (resp) res.getResponse().sentValue = resp;
			if (!functions[index + 1]) defer.resolve();
			else defer.reject(resp);
		};
		res.render = responseSent;
		res.handle = responseSent;
		res.jsonp = responseSent;
		res.json = responseSent;
		res.send = responseSent;
		res.end = responseSent;
		res.redirect = responseSent;
		try {
			functions[index](req, res, mockRoute.bind(null, defer, req, res, index + 1, functions));
		}
		catch(e) {
			defer.reject(e);
		}
	};
	/**
	 * @inner
	 * @summary Simulates express param middleware functionality
	 * @param defer {Promise} The promise to resolve once all the functions have been called for the middleware
	 * @param req {Object} The request object
	 * @param res {Object} The response object
	 * @param index {Integer} The index for the function we need to call
	 * @param params {Array} The array of parameter functions for the middleware
	 * @param paramIds {Array} The array of the parameter values
	 */
	let mockParams = function(defer, req, res, index, params, paramIds) {
		if (index === params.length) return defer.resolve();
		let funcDefer = q.defer();
		if (params[index]) {
			res.send = funcDefer.reject;
			let mockParamRoute = function(paramIndex, err) {
				if (err) return funcDefer.reject(err);
				if (params[index].length === paramIndex) return funcDefer.resolve();
				params[index][paramIndex](req, res, mockParamRoute.bind(null, paramIndex + 1), paramIds[index]);
			};
			// 0 is the name of the param, so we skip that
			mockParamRoute(1);
		}
		// sometimes there's no middleware binding it
		else {
			funcDefer.resolve();
		}
		funcDefer.promise.then(function() {
			mockParams(defer, req, res, index + 1, params, paramIds);
		}).fail(function(err) {
			defer.reject(err);
		});
	};
	// create the response object
	let resObj = {};
	let res = {
		header: function(value) { this.getResponse().header = value; return this; },
		status: function(value) { this.getResponse().status = value; return this; },
		set: function(key, value) {
			if (!this.getResponse().property) this.getResponse().property = {};
			this.getResponse().property[key] = value;
		},
		on: function() {},
		write: function(value) {
			if (!this.getResponse().writeValue) this.getResponse().writeValue = '';
			this.getResponse().writeValue += value;
			return true;
		},
		getResponse: function() { return resObj; }
	};
	// load the route and run the test
	routeFileObject(mockApp);
	let paramDefer = q.defer();
	let matchedParams = routeName.match(/:[^/]+/g);
	if (matchedParams) {
		mockParams(paramDefer, req, res, 0, _.map(matchedParams, function(paramName) {
			// remove the ':' from the start of the param name
			return mockApp.params[paramName.substring(1)];
		}), paramValues || []);
	}
	else {
		paramDefer.resolve();
	}
	paramDefer.promise.then(function() {
		let routeDefer = q.defer();
		mockRoute(routeDefer, req, res, 0, mockApp.routes[routeName][routeType]);
		return routeDefer.promise;
	}).then(function() {
		callback(null, res);
	}).fail(callback);
};
