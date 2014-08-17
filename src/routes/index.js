'use strict';
var _ = require("underscore");
var express = require('express');
var router = express.Router();
var request = require("request");
var models = require("../models");
var urls = require("../urls");
var pq = require("../pq");
var form = require("express-form");
var field = form.field;


var mainTitle = "Games on Twitch";

/* middlewares */

//fetch user from session ID cookie
router.use(function(req, res, next) {
    if(req.session.userId) {
        models.User.findById(req.session.userId, function(err, user) {
            if(err) next(err);
            req.user = user;
            res.locals.user = user;
            next();
        });
        return;
    }
    next()
});

//fetch any form errors from session and move to res.locals object
router.use(function(req, res, next) {
    if(req.session.formErrors) {
        res.locals.formErrors = req.session.formErrors;
        req.session.formErrors = undefined;
    }
    next();
});

//fetch queue by ID if used in URL
router.param("queueId", function(req, res, next, id) {
    models.Queue.findById(id, function(err, queue) {
        if(queue) {
            res.locals.queue = req.queue = queue;
        }
        next();
    });
});




/* URL handlers */
//home page. 
router.get(urls.home, function(req, res) {    
	res.render('index', { title: mainTitle });
});

//redirect uri for twitch authorization
router.get(urls.authTwitch, function(req, res) {
    if(req.query.error == "redirect_uri_mismatch") {
        console.log("twitch redirect URI mismatch: " + res.app.locals.twitchRedirectUri);
    }
	var code = req.query.code; // Twitch auth code given by authorization code flow (https://github.com/justintv/Twitch-API/blob/master/authentication.md)
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
	
	//otherwise check for existing user in db
	models.User.findOne({twitchCode:code}).select("_id").exec(function(err, user) {
        if(err) throw err;
        if(user) {
            sess.userId = user._id;
            redirect();
            return;
        }
        //create new user
        models.User.create({twitchCode: code}, function(err, user) {
            if(err) throw err;
            sess.userId = user._id;
            redirect(); 
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
        res.redirect(urls.dashboard);
    });

});

//user dashboard
router.get(urls.dashboard, function(req, res) {
	if(!req.user) {
		res.redirect(urls.home);
		return;
	}
    models.Queue.find({owner: req.user._id}).select("name").exec(function(err, queueList) {
        if(err) throw err;
        res.render("dashboard", {
            title: mainTitle + " - Dashboard",
            queueList: queueList
        });
    });
});

router.get(urls.queue.create, function(req, res) {
    if (!req.user) {
        res.redirect(urls.home);
        return;
    }
    res.render("queue-create", { title: mainTitle + " - Create a Queue" } );
});

router.post(urls.queue.create,
    form(
        field("name").trim().required().isAlphanumeric(),
        field("require_sub").trim().toBoolean(),
        field("require_follow").trim().toBoolean()
    ), function(req, res) {
        if(!req.user) {
            res.redirect(urls.home);
        }
        else if(!req.form.isValid) {
            req.session.formErrors = req.form.getErrors();
            res.redirect(req.query.return_to || urls.dashboard);
        }
        else {
            models.Queue.create({
                owner: req.user._id,
                name: req.form.name,
                requireSub: req.form.require_sub,
                requireFollow: req.form.require_follow
            }, function(err, q) {
                if(err) throw err;
                res.redirect(urls.dashboard);
            });

        }
});

router.get(urls.queue.display(":queueId"), function(req, res) {
    if(!(req.user && req.queue)) {
        res.redirect(urls.home);
    }
    req.queue.getPQ(function(err, pq) {
        if(err) throw err;
        pq.map(_.property("user"), function(err, userList) {
            if(err) throw err;
            res.render("queue-display", {
                title: mainTitle + " - " + req.queue.name,
                userList: userList
            });
        });
            
    });
});

//queue delete confirmation screen
router.get(urls.queue.delete(":queueId"), function(req, res) {
    if(!(req.user && req.queue && req.queue.owner.equals(req.user._id))) {
        res.redirect(urls.home);
        return;
    }
    res.render("queue-delete-confirm", {title: mainTitle + " - Confirm Deletion of " + req.queue.name});
    
});

//queue delete action
router.put(urls.queue.delete(":queueId"), function(req, res) {
    if(req.user && req.queue && req.queue.owner.equals(req.user._id)) {
        req.queue.remove(function(err, queue) {
            if(err) throw err;
        });
    }
    res.redirect(urls.dashboard);
});
    
router.get(urls.queue.settings(":queueId"), function(req, res) {
    if(!req.user || !req.queue || req.queue.owner != req.user._id) {
        res.redirect(urls.home);
        return;
    }
    res.render("queue-settings", {title: mainTitle + " - Edit " + req.queue.name});
});

router.put(urls.queue.settings(":queueId"), function(req, res) {
    if(!req.user || req.queue.owner != req.user._id) {
        res.redirect(urls.home);
        return;
    }
    models.User.findByIdAndUpdate(req.queue._id, req.body, function(err, user) {
        if(err) throw err;
        res.redirect(urls.dashboard);
    })
});

router.put(urls.queue.join(":queueId"), function(req, res) {
    //TODO: check subscription status
    if(!req.user) {
        res.redirect(urls.home)
        return;
    }
    req.queue.join(req.user, function(err, history) {
        if(err) throw err;
        req.queue.save();
        history.save();
        res.redirect(urls.queue.display(req.queue._id));
    });

});

module.exports = router;
