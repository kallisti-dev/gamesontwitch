'use strict';

var _ = require("underscore");
var $ = require("../utils");

var async = require("async");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var findOneOrCreate = require("../mongoose-plugins/find-one-or-create");
var cascadeDeletes = require("../mongoose-plugins/cascading-deletes");

var schemaTypes = require("./schema-types");
var Ref = schemaTypes.Ref;
var DefaultDate = schemaTypes.DefaultDate;

var config = require("../config");
var urls = require("../urls");

var Queue = require("./queue");
var QueueHistory = require("./queue-history");
var subsAndFollows = require("./subscriptions-and-follows");
var Subs = subsAndFollows.Subs;
var Follows = subsAndFollows.Follows;


/* User schema */
var userSchema = new Schema({
    twitchCode: {type: String, index: {unique: true}},
    twitchName: {type: String, unique: true},
    twitchAccessToken: String,
    steamId: {type: String, unique: true},
    dateCreated: DefaultDate,
})
.plugin(findOneOrCreate)
.plugin(cascadeDeletes(Queue, "ownerId"))
.plugin(cascadeDeletes(QueueHistory, "userId"))
.plugin(cascadeDeletes(Subs, "user channel"))
.plugin(cascadeDeletes(Follows, "user channel"));



userSchema.methods.twitchRequest = function(options, callback) {
    var self = this;
    var defaults = {
        encoding: "UTF-8",
        headers: {
            "Content-Type": "application/vnd.twitchtv.v3+json"
        }
    };
    var hasAuthHeader = false;
    if(_.has(options, "headers")) {
        _.defaults(options.headers, defaults.headers);
        hasAuthHeader = _.has(options.headers, "Authorization");
    }
    _.defaults(options, defaults);
    async.waterfall([
        function(next) {
            if(options.noAccessToken || hasAuthHeader) {
                next(null);
                return;
            }
            self.getAccessToken(function(err, token) {
                if(token) {
                    options.headers["Authorization"] = "OAuth " + token
                    next(null);
                    return;
                }
                next(err);
            });
        }, 
        function(next) {
            request(options, function(err, httpResponse, body) {
                if(body) {
                    body = JSON.parse(body);
                }
                next(err, httpResponse, body);
            });
        },
    ], callback); 
};

userSchema.methods.getAccessToken = function(callback) {
    var self = this;
    if(self.twitchAccessToken) {
        callback(null, self.twitchAccessToken);
        return;
    }
    var options = {
        url: urls.twitchApi.accessToken,
        method: "POST",
        noAccessToken: true,
        form: {
            client_id: app.locals.twitchId,
            client_secret: secrets.twitchSecret,
            grant_type: "authorization_code",
            redirect_uri: app.locals.twitchRedirectUri,
            code: self.twitchCode
        }
    };
    self.twitchRequest(options, function(err, httpResponse, body) {
        var token;
        if(body) {
            token = self.twitchAccessToken = body.access_token;
        }
        callback(err, token);
    });
};

userSchema.methods.twitchRequest404Helper = function(options, callback) {
    this.twitchRequest(options, function(err, httpResponse, body) {
        if(httpResponse.statusCode == 404) {
            callback(null, null);
            return;
        }
        callback(err, body);
    });
};

var getSubOrFollowHelper = function(model, expireTime, urlFunc) {
    return function(user, callback) {
        var self = this;
        model.findOne({channel: self._id, user: user._id}, $.onError(callback, function(obj) {
            if(obj) {
                var diff = Math.abs(Date.now().getTime() - obj.createdAt.getTime());
                if(diff / 3600000 < expireTime) {
                    callback(null, obj);
                    return;
                }
            }
            this.twitchRequest404Helper(
                { url: urlFunc(self.twitchName, user.twitchName) },
                $.onError(callback, function(obj) { model.create(obj, callback) })
            );
        })); 
    };
};

userSchema.methods.getSubscription = getSubOrFollowHelper(
    Subs, config.subCheckExpires, urls.twitchApi.checkSubscription);
userSchema.methods.getFollow = getSubOrFollowHelper(
    Follows, config.followCheckExpires, urls.twitchApi.checkFollow);


module.exports = mongoose.model('User', userSchema);