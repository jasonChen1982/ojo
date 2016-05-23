'use strict';

var generators = require('yeoman-generator');

module.exports = generators.Base.extend({
    constructor: function () {
        // Calling the super constructor is important so our generator is correctly set up
        generators.Base.apply(this, arguments);

        // This makes `language` a required argument.
        this.argument('language', { type: String, required: true });
    },

    // 创建文件结构
    makeProjectDirectoryStructure: function () {
        this.template('_i18n.json', 'i18n/' + this.language + '.json');
    }
});
