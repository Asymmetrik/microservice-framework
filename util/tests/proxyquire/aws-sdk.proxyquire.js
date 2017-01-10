
module.exports = {
	'aws-sdk': getAwsSdkMock
};

function getAwsSdkMock() {
	let _ = require('lodash'),
		sinon = require('sinon');

	let awsObjects = {};
	let s3Stub = {};

	return {
		S3: function (bucket) {
			s3Stub.putObject = function (params, callback) {
				let keySplit = params.Key.split('/');
				if (!awsObjects[keySplit[0]]) {
					awsObjects[keySplit[0]] = [];
				}
				awsObjects[keySplit[0]].push(keySplit[1]);
				callback(null, {}); // no error, data = {}
			};
			s3Stub.listObjects = function (params, callback) {
				let keySplit = params.Prefix.split('/');
				let ret = {
					Contents: _.map(awsObjects[keySplit[0]], function (file) {
						return {Key: keySplit[0] + '/' + file};
					})
				};
				callback(null, ret);
			};
			s3Stub.copyObject = function (params, callback) {
				let destSplit = params.Key.split('/');

				if (!awsObjects[destSplit[0]]) {
					awsObjects[destSplit[0]] = [];
				}
				awsObjects[destSplit[0]].push(destSplit[1]);

				callback(null, {CopyObjectResult: {}});
			};
			s3Stub.deleteObjects = function (params, callback) {
				_.each(params.Delete.Objects, function (obj) {
					let keySplit = obj.Key.split('/');
					_.pull(awsObjects[keySplit[0]], keySplit[1]);
				});
				callback(null, {});
			};
			s3Stub.getObject = function (params, callback) {
				let ret = awsObjects[bucket + params.Key];
				let error = ret ? null : new Error('No File Found');
				callback(error, ret);
			};
			s3Stub.upload = sinon.stub();

			return s3Stub;
		},
		proxyAccessMethods: {
			awsSdkS3Objects: awsObjects,
			resetUpload: function () {
				s3Stub.upload = sinon.stub();
				s3Stub.upload.callsArg(1);
			},
			s3Stub: s3Stub
		}
	};
}