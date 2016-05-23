'use strict';

var path = require('path');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');

var PKG_NAME = require('../package.json').name;

var BASE_DIR = path.join(__dirname, '..', PKG_NAME);
var DEFAULT_I18N = 'default';
var EXT_HTML = 'html';

var app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

app.use(express.static(BASE_DIR, {}));

/**
 * 生成 404 页面 HTML
 * @param  {string} pageName 页面
 * @param  {string} la       语言
 * @return {string}          404 页面 HTML
 */
function generate404HTML(pageName, la) {
    return [
        '<html><body>',
            '<h1>404</h1>',
            '<p>',
                'page `<span style="color:red">',
                pageName,
                '</span>` with i18n `<span style="color:red">',
                la,
                '</span>` NOT found!',
            '</p>',
        '</body></html>'
    ].join('');
}

/*** {{{{{{{{{ 请在这里编写你的业务逻辑 */

/**
 * 上传文件示例
 * 使用 https://github.com/expressjs/multer
var upload = require('multer')(); // for parsing multipart/form-data
app.post(
    '/upload',
    upload.single('filekey'), // filekey 为上传文件的参数名
    function (req, res) {
        console.log(req.file);
        res.send({
            success: true
        });
    }
);
*/


app.get('/logClickRedirect', function (req, res) {
    res.redirect(req.query.url);
});

/***  ----END---- }}}}}}}}} */


/**
 * @Important!!
 * 请保持这段代码在最后的位置，保证页面路由(/:pageName)的优先级不会高过于其它
 */
var logApis = ['Click', 'Event', 'Visit', 'System'].map(function (api) { return 'log' + api;});

app.get('/:pageName', function (req, res, next) {
    var pageName = req.params.pageName;
    function sendFile(fileName, notFoundCb) {
        var filePath = path.resolve(BASE_DIR, fileName);
        try {
            var stats = fs.lstatSync(filePath);
            if (stats.isFile()) {
                res.sendFile(filePath);
            } else {
                notFoundCb();
            }
        } catch(e) {
            notFoundCb();
        }
    }
    if (logApis.indexOf(pageName) >= 0) {
        return next();
    }
    var la = req.query.la;
    var fileName = pageName + '_' + (la || DEFAULT_I18N) + '.' + EXT_HTML;
    sendFile(fileName, function notFoundCb() {
        //如果找不到对应的语言文件，则发送默认 {pageName}.html文件
        var defaultFileName = pageName +'.' + EXT_HTML;
        sendFile(defaultFileName, function () {
            //默认文件都找不到，那就响应404
            res.status(400).send(generate404HTML(pageName, la));
        });
    });
});

/** mock log api */
logApis.forEach(function (api) {
    app.get('/' + api, function (req, res) { res.status(200).send(''); });
});

// 启动服务
var PORT = process.env.PORT || 9000;
express()
    .use('/' + PKG_NAME, app)
    .listen(PORT, function() {
        console.log('PORT:', PORT);
    });
