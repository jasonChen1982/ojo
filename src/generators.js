'use strict';

var path = require('path');

module.exports = function (cmd) {
    var yeoman = require('yeoman-environment');
    var env = yeoman.createEnv();
    var gPath = './' + path.join('generators', cmd, 'index.js');
    env.register(require.resolve(gPath), cmd);
    env.run(Array.prototype.join.call(arguments, ' '));
};
