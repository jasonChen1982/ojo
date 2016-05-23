'use strict';

var Promise = require('es6-promise').Promise;
var generators = require('yeoman-generator');
var path = require('path');
var cwd = process.cwd();
var pkg = require(path.resolve(cwd, './package.json'));
var request = require('request');
var chalk = require('chalk');
var extend = require('extend');
var fs = require('fs');
var _ = require('lodash');
var i18n = pkg.i18n;
var host = i18n.host;
var actId = i18n.actId;

var translateMethod = {
    replace: function (json, keys, replacer) {
        if (!json || !_.isObject(json)) { return; }
        if (!keys) { return; }
        if (_.isString(keys)) {
            keys = [keys];
        }
        keys.forEach(function (key) {
            var target = json;
            var props = key.split('.');
            var lastPropsIndex = props.length - 1;
            props.some(function (prop, index) {
                var prev = target;
                if ((target = target[prop])) {
                    if (index === lastPropsIndex) {
                        if (replacer) {
                            prev[prop] = replacer(target);
                        }
                    }
                    return false;
                } else {
                    return true;
                }
            });
        });
    }
};

var loadTranslateModule = function (translateModuleFileName) {
    var filePath = path.resolve(cwd, './i18n/' + translateModuleFileName);
    try {
        var stats = fs.lstatSync(filePath);
        if (stats.isFile(filePath)) {
            var module = extend({ exports: {} }, translateMethod);
            var fileCode = fs.readFileSync(filePath, { encoding: 'utf8' });
            var code = '(function (module) {' + fileCode + '})(module)';
            eval(code);
            return module;
        }
    } catch(e) {
        if (e.code === 'ENOENT') {
        } else {
            throw e;
        }
    }
};


var syncUseVersionToBabel = function (version) {
    console.log(version);
    var requestUrl = host + '/api/activities/' + actId+ '/syncDevVersion';
    return new Promise(function (resolve, reject) {
        request.post(requestUrl,
            {
                form: {
                    version: version,
                    time: new Date()
                }
            },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    resolve(JSON.parse(body));
                } else {
                    reject(error);
                }
            }
        );
    })
}

var translateJSONPkg = function (langName, json) {
    var translatorName = langName.replace(/-/ig, '_');
    var globalTranslator = loadTranslateModule('trans.js');//加载全局的翻译器
    var translator = loadTranslateModule(translatorName + '.trans.js'); //加载单个语言的翻译器
    if (globalTranslator && globalTranslator.exports) {
        try {
            globalTranslator.exports(json);
        } catch (e) {
            console.log(chalk.bold.yellow('[Warn]') + chalk.yellow(' Run user custom global translate (trans.js) failed'));
            throw e;
        }
    }
    if (translator && translator.exports) {
        try {
            translator.exports(json);
        } catch (e) {
            console.log(chalk.bold.yellow('[Warn]') + chalk.yellow(' Run user custom translate (' + translatorName + '.trans.js) failed'));
            throw e;
        }
    }
};

module.exports = generators.Base.extend({
    constructor: function () {
        // Calling the super constructor is important so our generator is correctly set up
        generators.Base.apply(this, arguments);

        // This makes `language` a required argument.
        this.argument('la', { type: String, required: true });
        this.argument('ve', { type: String, required: true });
    },

    downloadPkg: function () {
        var i18n = pkg.i18n;
        var host = i18n.host;
        var actId = i18n.actId;
        var defaultLang = i18n.default;
        var that = this;
        var lang = this.la;
        var version = this.ve;

        if (!actId) {
            this.log(chalk.red('Error'), 'package.json中找不到 actId(activitiy id) 的定义.');
            return;
        }
        var requestUrl = host + '/api/activities/' + actId+ '/langs';
        if (lang) {
            requestUrl += '/' + lang;
        }
        if (version) {
            requestUrl += '/' + version;
        }
        request(requestUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var pkgs = JSON.parse(body);
                if (!_.isArray(pkgs)) {
                    pkgs = [pkgs];
                }
                var syncLangJSONFile = function(filePath, pkg, isDefault) {
                    var lang = pkg.lang;
                    var i18nData;
                    function getTips(msg, isDefault) {
                        return isDefault ? chalk.bold.magenta('[默认语言] ') + msg : msg;
                    }
                    function getVersionTips(v1, v2) {
                        var tips;
                        if (v1 && !v2) {
                            tips = chalk.bgGreen.bold.white(' ' + v1 + ' ');
                        } else if (v1 && v2){
                            tips = chalk.bgGreen.bold.white(' ' + v2 + ' -> ' + v1 + ' ');
                        }
                        return tips;
                    }
                    var isSameVersion, oldVersion, newVersion;
                    try {
                        var stats = fs.lstatSync(filePath);
                        if (stats.isFile()) {
                            var i18nFile = fs.readFileSync(filePath);
                            if (i18nFile) {
                                i18nData = JSON.parse(i18nFile);
                            }
                            var syncI18nData = pkg.data || {};
                            oldVersion = i18nData.version;
                            newVersion = pkg.version;
                            isSameVersion = oldVersion === newVersion;
                            if (isSameVersion) {
                                that.log(getTips(chalk.green(lang + ' 已经同步到最新版本 ' + getVersionTips(newVersion)), isDefault));
                                syncI18nData.prevVersion = i18nData.prevVersion; //如果版本没有变化，则保持源文件中的prevVersion
                            }
                            if (!isSameVersion && oldVersion) { //如果版本发生变化，且原来就有版本号，意味着之前已经同步过了，这个时候则更新上一个版本号prevVersion
                                syncI18nData.prevVersion = oldVersion;
                            }
                            syncI18nData.version = newVersion;
                            i18nData = syncI18nData;
                        }
                    } catch(e) {
                        if (e.code === 'ENOENT') {
                            newVersion = pkg.version;
                            i18nData = {
                                i18n: lang,
                                version: newVersion
                            };
                            extend(i18nData, pkg.data);
                        } else {
                            that.log(getTips(chalk.red(lang + '同步失败了, 原因:' + e.message || ''), isDefault));
                            throw e;
                        }
                    }
                    i18nData = extend({
                        i18n: lang
                    }, i18nData);
                    if (!isDefault) {
                        translateJSONPkg(lang, i18nData);
                    }
                    fs.writeFileSync(filePath, JSON.stringify(i18nData, null, 4));
                    if (!isSameVersion){ //同一个版本的不进行同步成功提示，避免对用户造成过多的提示
                        syncUseVersionToBabel(newVersion).then(function () {
                            that.log(chalk.green('研发版本信息已同步到巴别塔'));
                        }, function () {
                            that.log(chalk.red('研发版本信息未能成功同步到巴别塔，可以重试一次, 或联系开发人员「张铭浩」'));
                        });
                        that.log(getTips(chalk.green(lang + ' 同步成功, 版本是 ' + getVersionTips(newVersion, oldVersion)) + ' 文件路径:' + chalk.blue(filePath), isDefault));
                    }
                };
                pkgs.forEach(function (pkg) {
                    var lang = pkg.lang;
                    var filePath = path.resolve(cwd, './i18n/' + lang.replace(/-/ig, '_') + '.json');
                    syncLangJSONFile(filePath, pkg);
                    if (defaultLang === lang) {
                        filePath = path.resolve(cwd, './i18n/default.json');
                        syncLangJSONFile(filePath, pkg, true);
                    }
                });
            } else {
                that.log(chalk.red('Error'), ' 同步语言包失败了. 使用的同步地址为：' + requestUrl);
            }
        });
    },


});
