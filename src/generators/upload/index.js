/*
 * 上传文件到静态资源平台上
 */

'use strict';

var Promise = require('es6-promise').Promise;
var generators = require('yeoman-generator');
var fs = require('fs');
var path = require('path');
var DESCRIPTION = 'upload file to static server';
var cwd = process.cwd();
var pkg = require(path.resolve(cwd, './package.json'));
var prettyBytes = require('pretty-bytes');
var chalk = require('chalk');
var request = require('request');
var urljoin = require('url-join');
var crypto = require('crypto');
var fs = require('fs');
var glob = require('glob');
var _ = require('lodash');




function md5(filePath) {
    var hash = crypto.createHash('md5');
    hash.update(fs.readFileSync(String(filePath), 'utf8'));
    return hash.digest('hex');
}


function processTask(task, projectName, callback) {
    var options = task.options;
    var uploadApi = urljoin(options.remote, '/e/uaeext/' + options.token, '?op=put');
    var prefix = task.prefix;
    var dest = task.dest;
    var srcList;
    if (_.isArray(task.src)) {
        srcList = task.src;
    } else {
        srcList = [task.src];
    }
    var files = [];
    srcList.forEach(function (src) {
        files = files.concat(glob.sync(src));
    });
    return Promise.all(files.map(function (file) {
        return upload(file, options.md5).then(function (result) {
            if (options.detail && result.stats.isFile()) {
                console.log(
                    '上传文件成功: ' +  chalk.cyan(file) +
                    ' , size: ' + chalk.yellow(prettyBytes(result.stats.size)) +
                    ', 访问地址: ' + chalk.underline.blue(result.body)
                );
            }
            return result;
        }, function (err) {
            console.error(err.stack);
            console.log(chalk.red('上传文件' + chalk.cyan(file) +'失败 ' + err.message));
        });
    })).then(function (results) {
        var items = results.filter(function (res) {
            return res.stats.isFile();
        }).map(function (res) {
            return {
                src: res.src,
                fullPath: res.filePath,
                filename: res.filename,
                size: res.stats.size,
                remoteUri: res.body
            };
        });
        callback(items);
    });


    function getFileName(filePath, needMd5) {
        var md5Str = '';
        var filename  = path.basename(filePath);
        var lastIndex  = filename.lastIndexOf('.');
        var name = filename.slice(0, lastIndex);
        var ext = filename.slice(lastIndex + 1, filename.length);
        if (needMd5) {
            md5Str = md5(filePath).slice(0, 8);
            return [name, md5Str, ext].join('.');
        } else {
            return [name, ext].join('.');
        }
    }

    function upload(file, md5) {
        return new Promise(function (resolve, reject) {
            var stats = fs.statSync(file);
            if (stats.isFile()) {
                var dirname = path.dirname(file).replace(prefix, '');
                if (dest) {
                    dirname = path.join(projectName, dest, dirname);
                } else {
                    dirname = path.join(projectName, dirname);
                }
                var md5Filename = getFileName(file, md5);
                var filename = path.basename(file);
                var api = uploadApi + '&dir=' + dirname + '&name=' + encodeURIComponent(md5Filename);
                var filePath = path.resolve(file);
                var requestConf = {
                    url: api
                };

                if (options.base64 === true) {
                    var baseBuffer = new Buffer(fs.readFileSync(filePath)).toString('base64');
                    requestConf.form = {
                        img: baseBuffer
                    };
                } else {
                    requestConf.formData = {
                        file: fs.createReadStream(filePath)
                    };
                }
                request.post(requestConf, function(err, httpResponse, body){
                    if (err) {
                        return reject(err);
                    }
                    return resolve({
                        stats: stats,
                        src: file,
                        md5Filename: md5Filename,
                        filename: filename,
                        dirname: dirname,
                        filePath: filePath,
                        response: httpResponse,
                        body: body
                    });
                });
            } else {
                resolve({
                    stats: stats
                });
            }
        });
    }
}

function createTasks(config, specifyTask) {
    var tasks = [], task;
    var options = config.options;
    var wrapTask = function (task, taskName) {
        task.name = taskName;
        task.options = _.extend(options, task.options);
        return task;
    };
    if (specifyTask) {
        task = config[specifyTask];
        if (task && task.src) {
            tasks.push(wrapTask(task, specifyTask));
        }
        return tasks;
    }
    for (var key in config) {
        if (config.hasOwnProperty(key) && key !== 'options') {
            task = config[key];
            if (task && task.src) {
                tasks.push(wrapTask(task, key));
            }
        }
    }
    return tasks;
}


module.exports = generators.Base.extend({
    constructor: function () {
        // Calling the super constructor is important so our generator is correctly set up
        generators.Base.apply(this, arguments);
        this.argument('task', { type: String, required: true });
    },

    upload: function () {
        var that = this;
        var STATIC_RES_MAP_JSON_FILE = './staticResMap.json';
        var staticResMapJSON;
        var config = pkg.uploadSettings;
        var options = config.options;
        var projectName = (options.folder || pkg.name).replace(/-/ig, '_'); //非常重要，因为静态资源平台用 - 会上传失败，血一般的教训！
        if (fs.existsSync(STATIC_RES_MAP_JSON_FILE)) {
            console.log(chalk.green('读取已有的资源文件:') + STATIC_RES_MAP_JSON_FILE);
            staticResMapJSON = JSON.parse(fs.readFileSync(STATIC_RES_MAP_JSON_FILE));
        } else {
            staticResMapJSON = {};
        }
        if (!options.remote) {
            options.remote = options.international ?
                'http://write.img.ucweb.com:8020':
                'http://write.image.uc.cn:8080' ;
        }
        if (!options.token) {
            this.log(chalk.red('请配置好静态资源平台的token'));
            return;
        }
        console.log('上传' + chalk.cyan(projectName) +
            ' 到静态资源服务器:' + chalk.underline.blue(options.remote));
        var tasks = createTasks(config, this.task);
        tasks.forEach(function (task) {
            console.log('处理：' + chalk.cyan(task.name));
            processTask(task, projectName, function (results) {
                staticResMapJSON[task.name] = results;
                var saveStr = JSON.stringify(staticResMapJSON, null, 4);
                var totalSize = results.reduce(function (total, res) { return total + res.size;}, 0);
                fs.writeFile(STATIC_RES_MAP_JSON_FILE, saveStr, function (err) {
                    if (err) {
                        return that.log(chalk.red('保存静态文件map失败，可以试着重试一下,如果还不行，那就找一下钗爷或浩子'));
                    }
                    console.log(
                        chalk.green('已经帮你上传完' + task.name + '了，一共上传了') +
                        chalk.yellow(results.length) +
                        chalk.green('个文件，共') +
                        chalk.yellow(prettyBytes(totalSize))
                    );
                });
            });
        });
    }
});
