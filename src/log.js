'use strict'
var path = require("path");
var config = require("./config");

//setup bunyan logger
module.exports = require('bunyan').createLogger({
    name: "gamesontwitch",
    streams: [
        {
            level: "debug",
            stream: process.stdout
        },
        {
            level: "error",
            type: 'rotating-file',
            count: 30,
            path: path.join(config.logDir, "errors.log"),
            stream: undefined
        },
        {
            level: "info",
            type: 'rotating-file',
            count: 30,
            path: path.join(config.logDir, "info.log"),
            stream: undefined
        }
    ]
});