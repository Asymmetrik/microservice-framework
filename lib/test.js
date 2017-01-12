'use strict';

const msf = require('../main');
const { namespace } = require('namespacer-js');

console.log('spaces', namespace.getSpaces());

const { logger } = require(namespace.resolve('MSF/logger'));

logger.info('IT WORKS');
