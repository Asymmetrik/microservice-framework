'use strict';

var msf = require('microservice-framework');

module.exports.index = function(req, res) {
	msf.util.sendSimple400Error(res, 'Not implemented');
};