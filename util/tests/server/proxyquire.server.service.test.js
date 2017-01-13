'use strict';

/** @module util/tests/query */

/**
 * Module dependencies.
 */
const should = require('should'),
	proxyquireService = require('../../../main').proxyquire;

/**
 * Tests
 */

describe('Proxyquire Service Unit Tests:', function() {

	it('should get mock path', function(done) {
		const filePath = proxyquireService.getMockPath('./util/server/services/util.server.service.js');
		filePath.should.equal('./util/tests/server/mocks/util.server.service.mock.js');
		done();
	});

	it('should be able to get an external mock', function(done) {
		const nodemailer = proxyquireService.getExternalMock('nodemailer');
		should.exist(nodemailer.createTransport); // this is the right service;
		should.exist(nodemailer.proxyAccessMethods); // this is the mocked version of the service;
		done();
	});

	it('should be able to mock an external module from a separate controller', function(done) {
		const utilService = proxyquireService.mockFile('./util/server/services/util.server.service.js');
		utilService.testingDependencies.length.should.equal(2);
		utilService.testingDependencies[0].should.equal('./util/server/services/date.server.service.js');
		// This method only exists on the mock; if it exists, this is the mocked module.
		should.exist(utilService.resetUpload);
		done();
	});

	it('should expose access to service for direct modification', function(done) {
		const utilService = proxyquireService.mockFile('./util/server/services/util.server.service.js', {directModification: ()=>42});
		should.exist(utilService.generateCleanRegex);
		// This method only exists on the mock; if it exists, this is the mocked module.
		utilService.isMocked().should.equal(true);
		// This method only exists on the mock; if it exists, this is the mocked module.
		utilService.directModification().should.equal(42);
		done();
	});

	it('should mock a nested file', function(done) {
		const utilService = proxyquireService.mockFile('./util/server/services/util.server.service.js');
		should.exist(utilService);
		should.exist(utilService.s3Stub);
		should.exist(utilService.resetUpload);
		done();
	});

	it('should expose variables at the top level for singly nested files', function(done) {
		const utilService = proxyquireService.mockFile('./util/server/services/util.server.service.js');
		should.exist(utilService.awsSdkS3Objects);
		done();
	});

	it('should be able to instantiate a mock service from a file', function(done) {
		const proxyMockService = proxyquireService.mockFile('./util/server/services/util.server.service.js');
		should.exist(proxyMockService.isNotMocked);
		done();
	});

	it('should still include un-mocked methods', function(done) {
		const proxyMockService = proxyquireService.mockFile('./util/server/services/proxyquire.server.service.js');
		const dependencies = proxyMockService.getDependencyList('./util/server/services/util.server.service.js');
		dependencies.length.should.equal(2);
		dependencies[0].should.equal('./util/server/services/date.server.service.js');
		done();
	});
});