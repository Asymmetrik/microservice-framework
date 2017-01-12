'use strict';

const path = require('path');

class Namespace {
    constructor(conf, root){
        if(!conf)
            throw new Error('No namespace config given');

        this._spaces = [];
        this._root = root.replace(`/${path.sep}*$/`, '')+path.sep;
        this._readConf(conf)
    }

    resolve(req) {
        for (let space of this._spaces)
            if (space.test.exec(req))
                return this._root + space.location + req.replace(space.test, '').replace(`/^${path.sep}*/`, '');
    }

    _readConf(conf){
        for(let space of Object.keys(conf)) {

            this._spaces.push({
                name: space,
                location: conf[space].replace(`/${path.sep}*$/`, '')+path.sep,
                test: new RegExp(`^${space}`, 'g')
            });
        }
    }
}

module.exports = (conf, root) => new Namespace(conf, root);