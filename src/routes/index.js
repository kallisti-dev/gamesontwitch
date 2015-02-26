'use strict';
var express = require('express');
var router = express.Router();
var models = require("../models");

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


/* sub-routers*/
router.use(require("./home"));
router.use(require("./auth"));
router.use(require("./queue"));

module.exports = router;
