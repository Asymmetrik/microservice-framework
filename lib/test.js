'use strict';

const { namespace } = require('../main');

const { logger } = require(namespace.resolve('MSF/logger')),
    conf = require(namespace.resolve('MSF/Config/env/default'));

logger.info('IT WORKS');

console.log(conf);


