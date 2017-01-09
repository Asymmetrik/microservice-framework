'use strict';

/** @module util/tests/query */

/**
 * Module dependencies.
 */
var	should = require('should'),
	proxyquireService = require('../../main').proxyquire;

var test, awsService;

/**
 * Tests
 */

describe('Proxyquire Service Unit Tests:', function() {

	// it('should get mock path', function(done) {
	// 	test = proxyquireService.getMockPath('./app/phone/server/services/twilio.server.service.js');
	// 	test.should.equal('./app/phone/tests/server/mocks/twilio.server.service.mock.js');
	//
	// 	test = proxyquireService.getMockPath('./app/aws/server/services/aws.server.service.js');
	// 	test.should.equal('./app/aws/tests/server/mocks/aws.server.service.mock.js');
	//
	// 	test = proxyquireService.getMockPath('./app/projects/server/services/tactic.server.service.js');
	// 	test.should.equal('./app/projects/tests/server/mocks/tactic.server.service.mock.js');
	//
	// 	done();
	// });

	it('should be able to get an external mock', function(done) {
		test = proxyquireService.getExternalMock('nodemailer');
		should.exist(test.createTransport); // this is the right service;
		should.exist(test.proxyAccessMethods); // this is the mocked version of the service;
		done();
	});

	it('should be able to mock an external module from a separate controller', function(done) {
		awsService = proxyquireService.mockFile('./app/aws/server/services/aws.server.service.js');
		awsService.testingDependencies.length.should.equal(1);
		awsService.testingDependencies[0].should.equal('aws-sdk');

		// Should expose access in case something needs to be manually overridden in a test.
		should.exist(awsService.s3Stub);

		// This method only exists on the mocked s3; if it exists, this is the mocked module.
		should.exist(awsService.resetUpload);
		done();
	});

	// it('should expose access to service for direct modification', function(done) {
	// 	emailService = proxyquireService.mockFile('./app/util/server/services/email.server.service.js');
	// 	should.exist(emailService.nodemailerEmailErrors);
	// 	done();
	// });
	//
	// it('should mock a nested file', function(done) {
	// 	twilioService = proxyquireService.mockFile('./app/phone/server/services/twilio.server.service.js');
	// 	should.exist(twilioService);
	// 	should.exist(twilioService.s3Stub);
	// 	should.exist(twilioService.resetUpload);
	// 	done();
	// });
	//
	// it('should expose variables at the top level for singly nested files', function(done) {
	// 	should.exist(twilioService.awsSdkS3Objects);
	// 	done();
	// });
	//
	// it('should be able to instantiate a mock service from a file', function(done) {
	// 	proxyMockService = proxyquireService.mockFile('./app/util/server/services/proxyquire.server.service.js');
	// 	should.exist(proxyMockService.awsSdkS3Objects);
	// 	test = proxyMockService.getMockPath('./app/projects/server/services/tactic.server.service.js');
	// 	test.should.equal('no');
	// 	done();
	// });
	//
	// it('should still include un-mocked methods', function(done) {
	// 	test = proxyMockService.getDependencyList('./app/phone/server/services/twilio.server.service.js');
	// 	test.length.should.equal(1);
	// 	test[0].should.equal('./app/aws/server/services/aws.server.service.js');
	// 	done();
	// });
});