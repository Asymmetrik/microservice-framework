'use strict';

/** @module lib/permissions */

var _ = require('lodash'),
    path = require('path'),
    config = require('./config'),
    logger = require('./bunyan').logger;
    
var schemes = {};

/**
 * @function init
 * @static
 * @summary Load and combine all the permission schemes
 */
module.exports.init = function () {
  logger.info('Loading permission schemes');
  config.files.server.permissions.forEach(function (permissionScheme) {
    _.assign(schemes, require(path.resolve(permissionScheme)));
  });
};

/**
 * @function get
 * @static
 * @summary Return the assembled list of permission schemes
 * @return {Object.<string, string[]>}
 */
module.exports.get = function () {
  return schemes;
};