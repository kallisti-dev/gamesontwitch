'use strict';
var _ = require("underscore");
var async = require("async");
var express = require('express');
var router = express.Router();
var config = require("../config");
var models = require("../models");
var urls = require("../urls");

//home page. 
router.get(urls.home, function(req, res) {  
    if(req.user) {
        res.redirect(urls.dashboard);
        return;
    }
	res.render('home', { title: config.mainTitle, noNav: true });
});


//user dashboard
router.get(urls.dashboard, function(req, res) {
	if(!req.user) {
		res.redirect(urls.home);
		return;
	}
    models.Queue.find({owner: req.user._id}).select("name").exec(function(err, ownedList) {
        if(err) throw err;
        models.QueueHistory.find({user: req.user._id, queued: true}).select("queue").populate("queue").exec(function(err, hList) {
            if(err) throw err;
            res.render("dashboard", {
                title: config.mainTitle + " - Dashboard",
                ownedList: ownedList,
                joinedList: _.map(hList, function(h) { return h.queue })
            });
        });
    });
});


module.exports = router;