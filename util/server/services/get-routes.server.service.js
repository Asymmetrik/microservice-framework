'use strict';

/**
 * @module util/server/get-routes
 *
 * @description Display all the registered Express routes and middleware.
 *   This is a modified version of the get-routes NPM module that also exposes nested router info
 */

var _ = require('lodash');

module.exports.getRoutes = function getRoutes(app) {
	if (!app) {
		throw new Error('App is missing.');
	}


	function getStack(stack) {
		var routes = {};
		var anonCounter = 1;

		if (!stack || !stack.length) {
			return 'function';
		}

		_.forOwn(stack, function(middleware) {
			var route = '',
				method = 'middleware',
				name = middleware.handle.name || '<anonymous ' + anonCounter++ + '>',
				subroute = 'function';

			if (middleware.route) {
				route = middleware.route.path;
				if (middleware.route.stack) {
					method = middleware.route.stack[0].method;
					subroute = getStack(middleware.route.stack);
				}
			}
			else if (middleware.handle.stack) {
				method = 'router';
				subroute = getStack(middleware.handle.stack);
			}

			routes[route] = routes[route] || {};
			routes[route][method] = routes[route][method] || {};

			if (name === 'bound dispatch') {
				routes[route][method] = subroute;
			}
			else {
				routes[route][method][name] = subroute;
			}
		});
		return routes;
	}
	return getStack(app._router.stack);
};