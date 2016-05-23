/*global require:true, process:true */

/*
 * grunt-tinypng
 * https://github.com/marrone/grunt-tinypng
 *
 * Copyright (c) 2013 Mike M
 * Licensed under the MIT license.
 */

var fis = require('fis3'),
    path = require('path'),
    pkg = {};

function getImgFile(){
    var filesObj = fis.project.getSource(),
        srcArray = [];
    for(var fileName in filesObj){
        if(fileName.lastIndexOf('.png')===(fileName.length-4) || fileName.lastIndexOf('.jpeg')===(fileName.length-5) || fileName.lastIndexOf('.jpg')===(fileName.length-4)){
            srcArray.push(filesObj[fileName].realpath);
        }
    }
    return srcArray;
}

module.exports = function() {

    'use strict';

    fis.project.setProjectRoot(process.cwd());
    pkg = require(path.resolve(process.cwd(), './package.json'));



    // // Please see the Grunt documentation for more information regarding task
    // // creation: http://gruntjs.com/creating-tasks

    var async = require("async"),
        Promise = require("promise"),
        SigFile = require("./tinyimg/model/SigFile"),
        ImageProcess = require("./tinyimg/model/ImageProcess"),
        ProgressView = require("./tinyimg/view/Progress"),
        SummaryView = require("./tinyimg/view/Summary");


    // Merge task-specific and/or target-specific options with these defaults.
    var options = {
        apiKey: 'Oj3e9V0pJymoyt1jY482tqd1J-73OqIc' || pkg.tinyimg.apiKey,
        summarize: pkg.tinyimg.summarize || false,  //true
        summarizeOnError: pkg.tinyimg.summarizeOnError || false,
        showProgress: pkg.tinyimg.showProgress || false,  //true
        stopOnImageError: pkg.tinyimg.stopOnImageError || false,   //false
        checkSigs: pkg.tinyimg.checkSigs || true,  //true
        sigFile: pkg.tinyimg.sigFile || '', //'./tinyimg/imgmd5.json'
        sigFileSpace: 0
    };

    if (options.checkSigs && !options.sigFile) {
        console.error("sigFile option required when specifying checkSigs option");
    }

    var skipCount = 0,
        fileSigs = new SigFile(options.sigFile, options.checkSigs && fis.util.exists(options.sigFile) && fis.util.readJSON(options.sigFile) || {}, options.sigFileSpace),
        progressView = options.showProgress ? new ProgressView() : null,
        maxDownloads = 5,
        downloadQueue,
        maxUploads = 5,
        uploadQueue,
        completedImages = [];


    function summarize() {
        var summaryView = new SummaryView();
        summaryView.render({
            skippedCount: skipCount,
            completedImages: completedImages
        });
    }

    function checkDone() {
        if (uploadQueue.running() === 0 && uploadQueue.length() === 0 && downloadQueue.running() === 0 && downloadQueue.length() === 0) {
            async.nextTick(function() {
                if (options.checkSigs) {
                    fileSigs.save();
                }
                if (progressView) {
                    progressView.renderDone();
                }
                if (options.summarize) {
                    summarize();
                }
            });
        }
    }

    function handleDownloadError(img, msg) {
        handleImageError(img, msg);
    }

    function handleUploadError(img, msg) {
        handleImageError(img, msg);
    }

    function handleImageError(img, msg) {
        completedImages.push(img);
        if (options.stopOnImageError) {
            if (options.summarizeOnError) {
                summarize();
            }
            fis.log.error(msg);
            uploadQueue.kill();
            downloadQueue.kill();
            // done(false);
        } else {
            fis.log.warn(msg);
            checkDone();
        }
    }

    function handleUploadStart(img) {
        //fis.log.warn("Processing image at " + img.srcpath);
    }

    function handleUploadComplete(img) {
        if (img.shouldDownload()) {
            downloadQueue.push(img);
        } else {
            fis.log.warn("output image is larger than source image, copying src " + img.srcpath + " to dest " + img.destpath);
            //todo
            fis.util.copy(img.srcpath, img.destpath);
            handleImageProcessComplete(img);
        }
    }

    function handleDownloadStart(img) {
        //fis.log.warn("making request to get image at " + img.compressedImageUrl);
    }

    function handleDownloadComplete(img) {
        //fis.log.warn("wrote minified image to " + img.destpath);
        handleImageProcessComplete(img);
    }

    function createImageProcess(srcpath, destpath) {
        var img = new ImageProcess(srcpath, destpath, options.apiKey, {
            trackProgress: options.showProgress
        });
        img.events.on(ImageProcess.EVENTS.UPLOAD_START, handleUploadStart);
        img.events.on(ImageProcess.EVENTS.UPLOAD_COMPLETE, handleUploadComplete);
        img.events.on(ImageProcess.EVENTS.UPLOAD_FAILED, handleUploadError);
        img.events.on(ImageProcess.EVENTS.DOWNLOAD_START, handleDownloadStart);
        img.events.on(ImageProcess.EVENTS.DOWNLOAD_COMPLETE, handleDownloadComplete);
        img.events.on(ImageProcess.EVENTS.DOWNLOAD_FAILED, handleDownloadError);
        if (options.showProgress) {
            progressView.addImage(img);
        }
        return img;
    }

    function uploadImage(img, callback) {
        img.process(callback);
    }

    function downloadImage(img, callback) {
        img.downloadImage(callback);
    }

    function handleImageProcessComplete(img) {
        completedImages.push(img);
        if (options.checkSigs) {
            SigFile.getFileHash(img.srcpath, function(fp, hash) {
                fileSigs.set(img.srcpath, hash).save();
                checkDone();
            });
        } else {
            checkDone();
        }
    }


    // START
    function init() {
        downloadQueue = async.queue(downloadImage, maxDownloads);
        uploadQueue = async.queue(uploadImage, maxUploads);
        uploadQueue.pause();

        var filesReady = [],
            files = getImgFile();

        // fis.util.find(searchPath, [new RegExp(smFileName)], null, path.resolve())


        // Iterate over all specified file groups.
        files.forEach(function(filepath) {

            filesReady.push(new Promise(function(resolve, reject) {
                // Warn on and remove invalid source files (if nonull was set).
                if (!fis.util.exists(filepath)) {
                    var errMsg = 'Source file "' + filepath + '" not found.';
                    fis.log.warn(errMsg);
                    reject(errMsg);
                    return;
                }

                //if (!grunt.option("force") && options.checkSigs && fis.util.exists(f.dest)) {
                if (options.checkSigs && fis.util.exists(filepath)) {
                    // fis.log.warn("comparing hash of image at " + filepath);
                    SigFile.compareFileHash(filepath, fileSigs.get(filepath), function(fp, matches) {
                        if (!matches) {
                            uploadQueue.push(createImageProcess(filepath, filepath));
                        } else {
                            //fis.log.warn("file sig matches, skipping minification of file at " + filepath);
                            skipCount++;
                        }
                        resolve();
                    });
                } else {
                    uploadQueue.push(createImageProcess(filepath, filepath));
                    resolve();
                }
            }));
        });

        Promise.all(filesReady).then(function() {
            uploadQueue.resume();
            checkDone();
        });
    }

    if (options.showProgress) {
        progressView.init(init);
    } else {
        init();
    }


};