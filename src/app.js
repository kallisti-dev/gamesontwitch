'use strict';
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
//var session = ;

var model = require("./models");
var routes = require('./routes/index');
var secrets = require('./secrets');
var urls = require("./urls");
var config = require("./config");

var app = express();

app.locals.urls = urls;
app.locals.rootUri = config.host;
app.locals.twitchRedirectUri = app.locals.rootUri + urls.authTwitch;
app.locals.steamRedirectUri = app.locals.rootUri + urls.authSteam;

app.locals.twitchId = config.twitchId;
app.locals.steamKey = config.steamKey;

/* helper functions */
app.locals.getSteamOpenIdParams = function (return_to) {
	return {
		"openid.ns": "http://specs.openid.net/auth/2.0",
		"openid.mode" : "checkid_setup",
		"openid.return_to" : app.locals.steamRedirectUri,
		"openid.realm": app.locals.rootUri,
		"openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
		"openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.state": return_to
	};
};

app.locals.getTwitchAuthParams = function(state) {
    return {
        response_type : "code",
        client_id: app.locals.twitchId,
        redirect_uri: app.locals.twitchRedirectUri,
        scope: "user_read channel_check_subscription",
        state: state 
    };
};


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(require('static-favicon')());
app.use(require('morgan')('dev')); //logging
app.use(require('express-method-override')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(require("express-session")({
	secret: secrets.twitchSecret,
	resave: false,
	saveUninitialized: false,
	unset: "destroy"
}));

app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
