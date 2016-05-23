var path = require('path');
var fis = require('fis3');

var cwd = process.cwd();
var pkg = require('../../package.json');
var FIS_ENV = require('./env');


// fis.cli.info = pkg;
// fis.cli.name = pkg.name;
fis.project.setProjectRoot(cwd);
fis.set('system.localNPMFolder', path.join(cwd, 'node_modules', pkg.name));
fis.set('system.globalNPMFolder', path.join(__dirname, '../..'));



// 默认开启 jshint
fis.config.set('settings.lint.jshint', {
    //ignored some files
    ignored : 'bower_components/**',
    // ignored : [ 'static/libs/**.js', /jquery\.js$/i ],

    //using Chinese reporter
    i18n : 'zh-CN',

    //jshint options
    "bitwise": true,
    "browser": true,
    "camelcase": true,
    "devel": true,
    "eqeqeq": true,
    "eqnull": true,
    "esnext": true,
    "forin": true,
    "immed": true,
    "indent": 4,
    "latedef": false,
    "newcap": true,
    "noarg": true,
    "node": true,
    "noempty": true,
    "predef": ["fis", "__uri", "__BACKEND_DATA__", "CONF", "MSG", "FILTER"],
    "quotmark": "single",
    "undef": true,
    "unused": true,
    "strict": true,
    "trailing": true,
    "white": false
});
fis.match('*.js', {
  // fis.config.set('modules.lint.js', 'jshint');
  lint: 'jshint'
});

// 默认开启 browserify debug
fis.config.set('settings.preprocessor.browserify', {
    // browserify opts
    browserify: {
        debug: true
    },
});

// 默认开启 csssprites 和 i18n
fis.match('::package', {
  spriter: fis.plugin('csssprites'),
  prepackager: fis.plugin('i18n')
});

// 默认开启 less 和 sass
fis.match('*.less', {
    parser: fis.plugin('less'),
    useSprite: true,
    rExt: 'css'
});
fis.match('*.{scss,sass}', {
    parser: fis.plugin('node-sass'),
    useSprite: true,
    rExt: 'css'
});

// prod 模式下进行压缩优化
fis.media('prod').match('*.js', {
  // fis-optimizer-uglify-js 插件进行压缩，已内置
  optimizer: fis.plugin('sm-uglify-js')
});
fis.media('prod').match('**/views/**/*.js', {
  // views目录下的js压缩时得到对应的sourceMap
  optimizer: fis.plugin('sm-uglify-js', {
    sourceMap: true
  })
});
fis.media('prod').match('*.{css,less,scss,sass}', {
  // fis-optimizer-clean-css 插件进行压缩，已内置
  optimizer: fis.plugin('clean-css')
});

/**
 * `png-compressor` + tinypng 会把图片压坏
fis.media('prod').match('*.png', {
  // fis-optimizer-png-compressor 插件进行压缩，已内置
  optimizer: fis.plugin('png-compressor')
});
*/

if (FIS_ENV.configPath) {
    try {
        require(FIS_ENV.configPath);
    } catch (e) {
        fis.log.error('Load %s error: %s \n %s', FIS_ENV.configPath, e.message, e.stack);
    }
    fis.emit('conf:loaded');
}

module.exports = fis;
