'use strict';

var generators = require('yeoman-generator');
var chalk = require('chalk');
var _ = require('lodash');

module.exports = generators.Base.extend({
    constructor: function () {
        generators.Base.apply(this, arguments);

        this.argument('subCommander', { type: String, required: true });
        this.argument('componentName', { type: String, required: false });
    },

    // 初始化一个组件
    _createNewComponent: function () {
        if (!this.componentName) {
            this.log(chalk.red('Error'), 'arg `componentName` NOT found!');
            return;
        }
        // 固定入口文件为 `components/${componentName}/index.${html|js|less}`
        this.componentName = _.kebabCase(this.componentName);
        var componentPath = 'components/' + this.componentName;
        var componentName = componentPath  + '/' + this.componentName;
        this.copy('cmp.js', componentName + '.js');
        this.template('_cmp.html', componentName + '.html');
        this.template('_cmp.less', componentName + '.less');
        // package.json 方便 require
        this.template('_package.json', componentPath + '/package.json');
    },

    // 安装全部组件， 包括 npm 和 bower
    _installAllCmp: function () {
        this.npmInstall();
        this.bowerInstall();
    },

    // 安装一个 GitLab 组件
    _bowerInstallCmp: function () {
        var cmpnt = this.componentName;
        if (!cmpnt) {
            this.log(chalk.red('Error'), 'arg `componentName` NOT found!');
            return;
        }
        cmpnt = 'git@git.ucweb.local:redfe/' + cmpnt;
        // //  仓库 component
        // if (cmpnt.indexOf('/') > 0) {
        //     // 读取 package.json
        //     var PACKAGE_JSON_PATH = './package.json';
        //     var packageContent = {};
        //     try {
        //         packageContent = this.fs.readJSON(PACKAGE_JSON_PATH);
        //     } catch (e) {
        //         this.log(e.message);
        //     }
        //     // 读取 git 配置
        //     var gitLocation = (packageContent.act || '').git || '';
        //     if (gitLocation) {
        //         cmpnt = 'git@' + gitLocation.replace(/^https?:\/\//, '').replace(/\/.*$/, '') + ':' + cmpnt;
        //     }
        // }
        // 通过 bower 下载
        // TODO: install bower
        this.bowerInstall(cmpnt, {
            save: true
        });
    },

    // 主函数：创建文件结构
    makeComponent: function () {
        switch (this.subCommander) {
            // 初始化一个组件
            case 'create':
            case 'new':
            case 'n':
                if (this.componentName) {
                    // 如果有指定 组件名称，则直接创建
                    this._createNewComponent();
                } else {
                    // 如果没有指定 组件名称，则询问
                    var done = this.async();
                    this.prompt([{
                        type: 'input',
                        name: 'componentName',
                        message: 'Your component name',
                        default: 'my-cmp'
                    }], function (answers) {
                        this.componentName = answers.componentName;
                        this._createNewComponent();
                        done();
                    }.bind(this));
                }
                break;
            // 安装组件
            case 'install':
            case 'i':
                if (this.componentName) {
                    // 如果有指定 组件名称，则直接下载改组件
                    this._bowerInstallCmp();
                } else {
                    // 如果没有指定 组件名称，则下载全部组件
                    this._installAllCmp();
                }
                break;
            default:
                this.log(this.help());
        }
    }
});
