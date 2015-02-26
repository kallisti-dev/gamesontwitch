'use strict';
var _ = require("underscore");
var async = require("async");
var express = require('express');
var router = express.Router();
var log = require('../log');
var models = require("../models");
var config = require("../config");
var urls = require("../urls");
var pq = require("../pq");
var form = require("express-form");
var field = form.field;


//fetch queue by ID if used in URL
router.param("queueId", function(req, res, next, id) {
    models.Queue.findById(id, function(err, queue) {
        if(queue) {
            res.locals.queue = req.queue = queue;
        }
        next();
    });
});

router.get(urls.queue.create, function(req, res) {
    if (!req.user) {
        res.redirect(urls.home);
        return;
    }
    res.render("queue-create", { title: config.mainTitle + " - Create a Queue" } );
});

router.post(urls.queue.create,
    form(
        field("name").trim().required()
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
                requireSub: false,
                requireFollow: false,
                prioritySettings: ["games"]
            }, function(err, q) {
                if(err) throw err;
                res.redirect(urls.queue.settings(q._id));
            });

        }
});

router.get(urls.queue.display(":queueId"), function(req, res) {
    if(!req.queue) {
        res.redirect(urls.home);
    }
    req.queue.getUsers(function(err, userList) {
        if(err) throw err;
        async.each(userList,
            function(user, next) {
                user.updateTwitchInfo(function(twitchErr, twitchUpdated) {
                    if(twitchErr) 
                        log.error(twitchErr);
                    user.updateSteamInfo(function(steamErr, steamUpdated) {
                        if(steamErr)
                            log.error(steamErr);
                        if(twitchUpdated || steamUpdated)
                            user.save(next);
                        else
                            next()
                    });
                });
            },
            function(err) {
                if(err) log.error(err);
                async.map(userList, function(user, next) {
                    models.QueueHistory.findOne({user: user, queue: req.queue}, function(err, hist) {
                        next(err, {user: user, history: hist});
                    });
                }, function(err, queueInfo) {   
                    if(err) throw err;
                    res.render("queue-display", {
                        title: config.mainTitle + " - " + req.queue.name,
                        queue: req.queue,
                        queueInfo: queueInfo
                    });
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
    res.render("queue-delete-confirm", {title: config.mainTitle + " - Confirm Deletion of " + req.queue.name});
    
});

//queue delete action
router.post(urls.queue.delete(":queueId"), function(req, res) {
    if(req.user && req.queue && req.queue.owner.equals(req.user._id)) {
        req.queue.remove(function(err, queue) {
            if(err) throw err;
            res.redirect(urls.dashboard);
        });
    }
});
    
router.get(urls.queue.settings(":queueId"), function(req, res) {
    if(!req.user || !req.queue || !req.queue.owner.equals(req.user._id)) {
        res.redirect(urls.home);
        return;
    }
    res.render("queue-settings", {title: config.mainTitle + " - Edit " + req.queue.name});
});

router.post(urls.queue.settings(":queueId"),
    form(
        field("name").trim().required().isAlphanumeric(),
        field("require_sub").trim().toBoolean(),
        field("require_follow").trim().toBoolean(),
        field("priority_settings").required()
    ), function(req, res) {
    if(!req.user) {
        res.redirect(urls.home);
        return;
    }
    if(!req.queue || !req.queue.owner.equals(req.user._id)) {
        res.redirect(urls.dashboard);
        return;
    }
    var q = req.queue;
    q.name = req.form.name;
    q.requireSub = req.form.require_sub;
    q.requireFollow = req.form.require_follow;
    q.prioritySettings = req.form.priority_settings.split(",");
    q.withPQ(function(err, pq, savePQ) {
        if(err) throw err;
        pq.rebalance(function(err) {
            if(err) throw err;
            savePQ();
            q.save(function(err) {
                if(err) throw err;
                res.redirect(urls.dashboard);
            });
        });
    });
});

router.post(urls.queue.join(":queueId"), function(req, res) {
    //TODO: check subscription status
    if(!req.user) {
        res.redirect(urls.home)
        return;
    }
    req.queue.join(req.user, function(err, history) {
        if(err) throw err;
        history.save(function(err) {
            if(err) throw err;
            req.queue.save(function(err) {
                if(err) throw err;
                res.redirect(urls.queue.display(req.queue._id));
            });
        });
    });
});

router.post(urls.queue.unjoin(":queueId"), function(req, res) {
    if(!req.user) {
        res.redirect(urls.home);
        return;
    }
    req.queue.unjoin(req.user, function(err, h) {
        if(err) throw err;
        h.save(function(err) {
            if(err) throw err;
            req.queue.save(function(err) {
                if(err) throw err;
                res.redirect(urls.queue.display(req.queue._id));
            });
        });
    });
});

module.exports = router;