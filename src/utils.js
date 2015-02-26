'use strict';
//general purpose custom utility library for internal use.
//
//This module is typically bound to the $ symbol in importing modules.

var log = require("./log");
var config = require("./config");

//wrap a standard f(err, ...) style callback so that it automatically passes errors to a given error-handling callback
module.exports.onError = function(errHandler, callback) {
    return function(err) {
        if(err) return errHandler(err);
        return callback.apply(this, Array.prototype.slice.call(arguments, 1));
    };
};


module.exports.finallyDo = function(finalizer, callback) {
    return function(err) {
        if(!err) callback.apply(this, Array.prototype.slice.call(arguments, 1));
        finalizer.apply(this, arguments);
    };
};

module.exports.renderError = function(err, req, res) {
    if(!err.logged)
        log.error('error', '%s (status: %s)\n%s', err.message, err.status, err.stack);
    res.render('error', {
        message: err.message,
        error: config.env == 'development'? err : {},
        noNav: true
    });
    res.status(err.status || 500);
};
