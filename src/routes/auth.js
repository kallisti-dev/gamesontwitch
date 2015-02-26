'use strict';
var _ = require("underscore");
var async = require("async");
var express = require('express');
var router = express.Router();
var models = require("../models");
var config = require("../config");
var urls = require("../urls");
var log = require('../log');



//redirect uri for twitch authorization
router.get(urls.authTwitch, function(req, res) {

	var code = req.query.code; // Twitch auth code given by authorization code flow (https://github.com/justintv/Twitch-API/blob/master/authentication.md)
    var err = req.query.error;
	var sess = req.session;
    
    var redirect = function() {
    	if(req.query.state) {
            res.redirect(res.app.locals.rootUri + req.query.state);
            return;
        }
        res.redirect(urls.home);
    };
    
    //if already authenticated, redirect
	if(sess.userId) {
		redirect();
		return;
	}
    if(req.query.error) {
        log.error(req.query);
        return;
    }
    if(!code) {
        log.error("No auth code found in twitch response object");
        log.error(req.query);
        return;
    }
	
    var newUser = new models.User();
    newUser.twitchCode = code;
    newUser.updateTwitchInfo(function(err) {
        if(err) throw err;
        //attempt to find existing user
        models.User.findOne({twitchId: newUser.twitchId}, function(err, user) {
            if(err) throw err;
            if(user) {
                user.twitchName = newUser.twitchName
                user.twitchCode = newUser.twitchCode;
                user.twitchAccessToken = newUser.twitchAccessToken;
            }
            else {
                user = newUser;
            }
            sess.userId = user._id;
            user.save(function(err) {
                if(err) throw err;
                redirect();
                return;
            });
        });
    });
});

//redirect uri for steam auth
router.get(urls.authSteam, function(req, res) {
    var sess = req.session;
    var pathSeg = req.query["openid.claimed_id"].split("/");
    
    var steamId = pathSeg[pathSeg.length-1];
    models.User.findByIdAndUpdate(sess.userId, {steamId: steamId}, function(err, item) {
        if(err) throw err;
        var returnTo = req.query['openid.state'];
        if(returnTo) {
            res.redirect(returnTo);
            return;
        }
        res.redirect(urls.home);
    });

});

//site logout URI

router.post(urls.logout, function(req, res) {
    res.clearCookie('connect.sid', {path: '/'});
    res.redirect(urls.home);
});

module.exports = router;