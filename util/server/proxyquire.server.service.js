'use strict';

/** @module util/services/email */

var path = require('path'),
	q = require('q'),
	_ = require('lodash'),
	proxyquire = require('proxyquire'),
	sinon = require('sinon'),

	deps = require(path.resolve('./config/dependencies.js')),
	config = deps.config,
	logger = deps.logger,

	mongoose = require('mongoose'),
	User = mongoose.model('User'),

	nodemailer = require('nodemailer'),
	shouldSinon = require('should-sinon'), // Activate should-sinon extensions
	smtpTransport;

exports.testingDependencies = [];

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
	} catch(err) {} // Do nothing, this means no file exists.

	var dependencies = exports.getDependencyList(filePath);
	_.each(dependencies, function(dependency) {
		var key = dependency;
		var options = exports.getExternalMock(key);

		// This is not an external mock, must be a campfire file.
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

exports.getExternalMock = function(name) {
	switch(name) {
		case 'aws-sdk': return getAwsSdkMock();
		case 'nodemailer': return getNodemailerMock();
	}
};

function getAwsSdkMock() {
	var awsObjects = {};
	var s3Stub = {};
	var awsPrefix = 'https://' + config.aws.bucket + '.s3.amazonaws.com/';

	return {
		S3: function(bucket) {
			s3Stub.putObject = function(params, callback) {
				var keySplit = params.Key.split('/');
				if (!awsObjects[keySplit[0]]) {
					awsObjects[keySplit[0]] = [];
				}
				awsObjects[keySplit[0]].push(keySplit[1]);
				callback(null, {}); // no error, data = {}
			};
			s3Stub.listObjects = function(params, callback) {
				var keySplit = params.Prefix.split('/');
				var ret = {
					Contents: _.map(awsObjects[keySplit[0]], function(file) {
						return { Key: keySplit[0] + '/' + file };
					})
				};
				callback(null, ret);
			};
			s3Stub.copyObject = function(params, callback) {
				var sourceSplit = params.CopySource.split('/');
				var destSplit = params.Key.split('/');

				if (!awsObjects[destSplit[0]]) {
					awsObjects[destSplit[0]] = [];
				}
				awsObjects[destSplit[0]].push(destSplit[1]);

				callback(null, {CopyObjectResult: {}});
			};
			s3Stub.deleteObjects = function(params, callback) {
				_.each(params.Delete.Objects, function(obj) {
					var keySplit = obj.Key.split('/');
					_.pull(awsObjects[keySplit[0]], keySplit[1]);
				});
				callback(null, {});
			};
			s3Stub.getObject = function(params, callback) {
				var ret = awsObjects[awsPrefix + params.Key];
				var error = ret ? null : new Error('No File Found');
				callback(error, ret);
			};
			s3Stub.upload = sinon.stub();

			return s3Stub;
		},
		proxyAccessMethods: {
			awsSdkS3Objects: awsObjects,
			resetUpload: function() {
				s3Stub.upload = sinon.stub();
				s3Stub.upload.callsArg(1);
			},
			s3Stub: s3Stub
		}
	};
}

function getNodemailerMock() {
	var mailErrors = {};
	return {
		createTransport: function(options) {
			return {
				sendMail: function(mailOptions, callback) {
					if (mailErrors[mailOptions.to]) {
						callback({ error: mailErrors[mailOptions.to], mailOptions: mailOptions });
					}
					else {
						callback();
					}
				}
			};
		},
		proxyAccessMethods: {
			nodemailerEmailErrors: mailErrors
		}
	};
}