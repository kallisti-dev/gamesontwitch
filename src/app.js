'use strict';
var _ = require('underscore');
var express = require('express');
var path = require('path');
var fs = require('fs');
var bodyParser = require('body-parser');
var morgan = require('morgan');
//var session = ;

var $ = require("./utils");
var log = require("./log");
var model = require("./models");
var routes = require('./routes/index');
var secrets = require('./secrets');
var urls = require("./urls");
var config = require("./config");

var app = express();

app.locals._ = _;
app.locals.urls = urls;
app.locals.log = log;

app.locals.rootUri = "http://" + config.host;
app.locals.twitchRedirectUri = app.locals.rootUri + urls.authTwitch;
app.locals.steamRedirectUri = app.locals.rootUri + urls.authSteam;

app.locals.twitchId = config.twitchId;
app.locals.steamKey = config.steamKey;

app.locals.steamAuthOptions = function(options) {
    if(!options) options = {};
    var steamParams = {
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode" : "checkid_setup",
        "openid.return_to" : app.locals.steamRedirectUri,
        "openid.realm": app.locals.rootUri,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.state": options.returnTo || urls.dashboard
    };
    options = _.extend(options, {
        authUrl: urls.steamApi.authorize,
        params: _.extend(steamParams, options.params),
        caption: options.caption || "Connect to Steam"
    });
    return options;
}

app.locals.twitchAuthOptions = function(options) {
    if(!options) options = {};
    var twitchParams = {
        response_type : "code",
        client_id: app.locals.twitchId,
        redirect_uri: app.locals.twitchRedirectUri,
        scope: "user_read channel_check_subscription",
        state: options.returnTo || urls.dashboard
    }
    options = _.extend(options, {
        authUrl: urls.twitchApi.authorize,
        params: _.extend(twitchParams, options.params), 
        caption: options.caption || "Connect to Twitch"
    });
    return options;
}

app.set('port', config.port || 3000);
app.set('env', config.env || "development");
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('x-powered-by', false); //remove "X-Powered-By: Express" HTTP header

app.use(require('serve-favicon')(__dirname + '/public/images/favicon.ico'));

//setup request-logging middleware
var logFormat = ':remote-addr ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
app.use(morgan(logFormat, { //logger for all requests
    stream: {
        skip: function(req, res) { return res.statusCode >= 400; },
        write: function(s) { log.info(s); }
    }
}));
app.use(morgan(logFormat, { //logger for error requests
    skip: function (req, res) { return res.statusCode < 400 },
    stream: {
        write: function(s) { log.error(s); }
    }
}));
app.use(require('express-method-override')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(require("express-session")({
	secret: secrets.twitchSecret,
	resave: false,
	saveUninitialized: false,
	unset: 'destroy'
}));
app.use(require('stylus').middleware({
    'src': path.join(__dirname, 'public'),
    'debug': true
}));


//serve static urls.js
app.use(urls.scripts.urls, function(req, res, next) {
    res.sendFile("urls.js", {root:__dirname});
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    $.renderError(err, req, res);
    next(err);
});



module.exports = app;
