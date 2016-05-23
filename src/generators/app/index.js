'use strict';

var generators = require('yeoman-generator');
var chalk = require('chalk');
var _ = require('lodash');

var DEFAULT_I18N = 'default';

module.exports = generators.Base.extend({
    constructor: function() {
        // Calling the super constructor is important so our generator is correctly set up
        generators.Base.apply(this, arguments);
    },

    // download: function () {
    //     //
    //     this.remote(
    //         'http://git.ucweb.local/chenhc/f-template-app/repository/archive.zip',
    //         function(err, remote) {
    //             // remote.copy('.', 'vendors/user-repo');
    //             console.log(err);
    //             console.log(remote);
    //         }
    //     );
    // }

    // 询问 活动名称
    promptActName: function() {
        var done = this.async();
        var defaultName = _.kebabCase(this.appname); // Default to current folder name
        var defaultGitHost = '';

        // 读取 package.json 设置默认值
        try {
            var PACKAGE_JSON_PATH = './package.json';
            var packageContent = this.fs.readJSON(PACKAGE_JSON_PATH);
            defaultName = packageContent.name;
            defaultGitHost = packageContent.act.git;
        } catch (e) {
        }

        this.prompt([{
            type: 'input',
            name: 'actName',
            message: 'Your project name',
            default: defaultName
        }], function (answers) {
            var actName = answers.actName.toLowerCase() === 'y' ? defaultName : answers.actName;
            this.actName = _.kebabCase(actName);
            this.gitName = this.user.git.name();
            this.gitEmail = this.user.git.email();
            done();
        }.bind(this));
    },

    // 创建文件结构
    makeProjectDirectoryStructure: function() {
        this.template('_package.json', 'package.json');
        this.template('_bower.json', 'bower.json');
        this.template('_README.md', 'README.md');
        this.copy('fis-conf.js', 'fis-conf.js');
        this.copy('jshintrc', '.jshintrc');

        // this.directory('fis', 'fis');
        this.directory('server', 'server');

        this.i18n = DEFAULT_I18N;
        this.template('i18n/_i18n.json', 'i18n/' + DEFAULT_I18N + '.json');
    },

    // show sub-cmd tips when `end`
    end: function() {
        this.bowerInstall(['git@git.ucweb.local:pffe/perf','git@git.ucweb.local:redfe/suitui'], {
          save: true
        });
        this.npmInstall();
        // this.log(
        //     '\n' +
        //     chalk.cyan('Tips ') +
        //     'Use `' +
        //     chalk.green('f view <view-name>') +
        //     '` to create views!\n     Use `' +
        //     chalk.green('f cmp <cmp-name>') +
        //     '` to create components!'
        // );
    }
});
