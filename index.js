#!/usr/bin/env node
'use strict';

var generators = require('./src/generators');
var release = require('./src/release');
var server = require('./src/server');
var pkg = require('./package.json');
var sm = require('./src/sm');
var tinyimg = require('./src/tinyimg');

var program = require('commander')
    .version(pkg.version);

/**
 * 脚手架相关
 */
program
    .command('init')
    .description('create a new front-end project')
    .action(function () {
        generators('app');
        // TODO: sync
        // generators('view', 'index');
    });

program
    .command('i18n <lang>')
    .description('create a new i18n JSON file')
    .action(function (lang) {
        generators('i18n', lang);
    });

program
    .command('sync')
    .description('sync i18n JSON file')
    .option('-l, --la <la>', 'languages option')
    .option('-v, --ve <ve>', 'version option')
    .action(function (options) {

        generators('sync', options.la, options.ve);
    });

program
    .command('upload [task]')
    .description('upload file to static server')
    .action(function (task) {
        generators('upload', task);
    });

program
    .command('v <name>')
    .alias('view')
    .description('create a new view page')
    .action(function (name) {
        generators('view', name);
    });

program
    .command('c <name>')
    .alias('cmp')
    .description('create a new component')
    .action(function (name) {
        generators('cmp', 'create', name);
    });

program
    .command('i [cmp]')
    .alias('install')
    .description('install pffe component(s) from git.ucweb.local')
    .action(function (cmp) {
        generators('cmp', 'i', cmp);
    });

//source map
program
    .command('sm <errFile> <line> <col>')
    .description('return error in the position of the original code')
    .option('-a, --all', 'find sourcemap in all direction; if without the option, find sourcemap in current "sourcemap" direction')
    .action(function(errFile, line, col, options){
        sm(errFile, line, col, !!options.all);
    });


//tinyimg
program
    .command('tinyimg')
    .description('image optimization via tinypng service')
    .action(function(){
        tinyimg();
    });


/**
 * fis3 相关
 */
program
    .command('w')
    .alias('watch')
    .description('build and watch your project with fis3')
    .option('--child-flag', 'hack fis3-release-watch --child-flag')
    .action(function () {
        // server.clean();
        release({
            c: true, // --clean
            w: true, // --watch
            l: true, // --lint
            L: true, // --live
        });
    });

program
    .command('r [media]')
    .alias('release')
    .description('build your project with fis3')
    .option('-d, --dest <path>', 'release output destination')
    .option('-l, --lint', 'with lint')
    .option('-w, --watch', 'monitor the changes of project')
    .option('-L, --live', 'automatically reload your browser')
    .option('-c, --clean', 'clean compile cache')
    .option('-u, --unique', 'use unique compile caching')
    .option('-r, --root <path>', 'specify project root')
    .option('-f, --file <filename>', 'specify the file path of `fis-conf.js`')
    .option('--child-flag', 'hack fis3-release-watch --child-flag')
    .action(function (media, options) {
        var argv = {};
        if (options.dest) {
            argv.d = options.dest;
        }
        if (options.lint) {
            argv.l = options.lint;
        }
        if (options.watch) {
            argv.w = options.watch;
        }
        if (options.live) {
            argv.L = options.live;
        }
        if (options.clean) {
            argv.c = options.clean;
        }
        if (options.unique) {
            argv.u = options.unique;
        }
        if (options.root) {
            argv.r = options.root;
        }
        if (options.file) {
            argv.f = options.file;
        }
        release(argv, media);
    });

program
    .command('s')
    .alias('start')
    .option('-c, --clean', 'clean compile cache')
    .option('--live', 'release output destination')
    .description('start server')
    .action(function (options) {
        if (options.clean) {
            server.clean();
        } else {
            server.start();
        }
    });

program
    .command('open')
    .description('open server folder')
    .action(function () {
        server.open();
    });


program.parse(process.argv);

// print help if there is no sub-command
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
