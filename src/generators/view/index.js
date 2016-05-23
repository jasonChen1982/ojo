'use strict';

var generators = require('yeoman-generator');
var _ = require('lodash');

module.exports = generators.Base.extend({
    constructor: function () {
        // Calling the super constructor is important so our generator is correctly set up
        generators.Base.apply(this, arguments);

        // This makes `viewName` a required argument.
        this.argument('viewName', { type: String, required: true });
        // And you can then access it later on this way;
        this.viewName = _.camelCase(this.viewName).toLowerCase();
    },

    // 创建文件结构
    makeProjectDirectoryStructure: function () {
        // 固定入口文件为 `views/${viewName}/index.${html|js}`
        var viewFilePath = 'views/' + this.viewName;
        var viewFileName = viewFilePath + '/' + this.viewName;
        this.copy('index.js', viewFileName + '.js');
        this.copy('index.less', viewFileName + '.less');
        this.template('_index.html', viewFileName + '.html');
        // 模拟数据
        this.template('backend-data.js', viewFilePath + '/backend-data.js');
    }
});
