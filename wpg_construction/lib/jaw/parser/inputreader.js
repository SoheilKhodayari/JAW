/*
 * Read input commands
 * @lastmodifiedBy Soheil
 */

/**
 * InputReader
 * @constructor
 */
function InputReader() {
}

Object.defineProperties(InputReader.prototype, {
    /**
     * Command flag to specify JS file names
     * @type {string}
     * @memberof InputReader.prototype
     */
    JS_FILES_FLAG: {
        value: '-js',
        enumerable: true
    },

    CSV_OUTPUT_FLAG: {
        value: '-o',
        enumerable: true
    },

});

/**
 * Read input content to separate JS file names of different pages
 * @param {Array} argv
 * @returns {Array} Collections of JS file names
 */
InputReader.prototype.readInput = function (argv) {
    "use strict";
    var theInputReader = this;
    var indexesOfJSFiles = [];
    var indexOfOutput = [];
    argv.forEach(function (arg, index) {
        if (arg === theInputReader.JS_FILES_FLAG) {
            indexesOfJSFiles.push(index);
        } else if(arg === theInputReader.CSV_OUTPUT_FLAG){
            indexOfOutput.push(index);
        }
    });
    var collectionOfJSFileNames = [];

    indexesOfJSFiles.forEach(function (indexOfJSFiles, index) {
        if (index !== indexesOfJSFiles.length - 1 && (indexesOfJSFiles[index + 1] !== indexOfJSFiles + 1)) {
            collectionOfJSFileNames.push(argv.slice(indexOfJSFiles + 1, indexesOfJSFiles[index + 1]));
        } else {
            if(indexOfOutput.length){
                collectionOfJSFileNames.push(argv.slice(indexOfJSFiles + 1, indexOfOutput[0]));
            }else {
                collectionOfJSFileNames.push(argv.slice(indexOfJSFiles + 1));
            }   
        }
    });

    var relativeOutputPath = [];
    indexOfOutput.forEach(function (outIndex, index) {
        if (index !== indexOfOutput.length - 1 && (indexOfOutput[index + 1] !== outIndex + 1)) {
            relativeOutputPath.push(argv.slice(outIndex + 1, indexOfOutput[index + 1]));
        } else {
            relativeOutputPath.push(argv.slice(outIndex + 1));
        }
    });


    return [collectionOfJSFileNames, relativeOutputPath];
};

var reader = new InputReader();
module.exports = reader;