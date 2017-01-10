'use strict';

/** @module util/services/email */

var path = require('path'),
	_ = require('lodash'),
	proxyquire = require('proxyquire'),
	config = require('../../../lib/config'),
	logger = require('../../../lib/logger').logger;

exports.testingDependencies = [];
let mockServiceRegistry = {};
let mockServices = {};

exports.getDependencyList = function(filePath) {
	var dependency = require(path.resolve(filePath));
	return dependency.testingDependencies || [];
};

exports.getMockPath = function(str) {
	var regex = /(.*)\/server\/.*\/(.*).js/;
	if (str.match(regex)) {
		return str.replace(regex, '$1' + '/tests/server/mocks/' + '$2' + '.mock.js');
	}
	return str;
};

exports.mockFile = function(filePath, proxyAccessMethods) {
	var mockPath = exports.getMockPath(filePath);
	var proxyOptions = {};
	var fileMethods = {};
	proxyAccessMethods = proxyAccessMethods || {};

	try {
		fileMethods = require(path.resolve(mockPath));
	} catch(err) {
		logger.error(err);
	} // Do nothing, this means no file exists.

	var dependencies = exports.getDependencyList(filePath);
	_.each(dependencies, function(dependency) {
		var key = dependency;
		var options = exports.getExternalMock(key);

		// This is not an external mock, must be a file.
		if (!options) {
			key = path.resolve(dependency);
			options = exports.mockFile(dependency, proxyAccessMethods);
		}

		if (options.proxyAccessMethods) {
			proxyAccessMethods = _.extend(proxyAccessMethods, options.proxyAccessMethods);
		}

		proxyOptions[key] = options;
	});


	// Append access methods to mocked file, so the test has the ability to access / modify data
	var ret = proxyquire(path.resolve(filePath), proxyOptions);
	ret = _.extend(ret, proxyAccessMethods, fileMethods);
	return ret;
};

exports.getExternalMock = function(name, reload) {
	if (mockServiceRegistry[name]){
		return mockServiceRegistry[name];
	}
	if (!mockServiceRegistry[name] || reload) {
		try {
			mockServiceRegistry[name] = mockServices[name]();
			return mockServiceRegistry[name];
		}
		catch (err) {
			logger.error(`Failed to retrieve external mock: ${name}`);
			return null;
		}
	}
};

function initProxyquire() {
	if (config.files.tests.proxyquire) {
		_.each(config.files.tests.proxyquire, function(file) {
			_.assign(mockServices, require(path.resolve(file)));
		});
	}
}

initProxyquire();