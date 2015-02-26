'use strict';

var _ = require("underscore");
var $ = require("../utils");

var async = require("async");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var request = require("request");

var findOneOrCreate = require("../mongoose-plugins/find-one-or-create");
var cascadeDeletes = require("../mongoose-plugins/cascading-deletes");

var schemaTypes = require("./schema-types");

var config = require("../config");
var secrets = require("../secrets");
var urls = require("../urls");
var log = require("../log");

var Queue = require("./queue");
var QueueHistory = require("./queue-history");
var subsAndFollows = require("./subscriptions-and-follows");
var Subs = subsAndFollows.Subs;
var Follows = subsAndFollows.Follows;


/* User schema */
var userSchema = new Schema({
    twitchId: {type: String, index: {unique: true}},
    twitchName: String,
    twitchDisplayName: String,
    twitchCode: String,
    twitchAccessToken: String,
    twitchLogoUrl: String,
    steamId: {type: String, unique: true},
    steamProfileUrl: String,
    steamDisplayName: String,
    steamAvatar: String,
    dateCreated: schemaTypes.DefaultDate,
    lastTwitchInfoUpdate: Date,
    lastSteamInfoUpdate: Date
})
.plugin(findOneOrCreate)
.plugin(cascadeDeletes, {model: Queue, fields: "owner"})
.plugin(cascadeDeletes, {model: QueueHistory, fields: "user"})
.plugin(cascadeDeletes, {model: Subs, fields: "user channel"})
.plugin(cascadeDeletes, {model: Follows, fields: "user channel"})

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
                    if(body.error)
                        log.error(body);
                    else
                        log.debug(body);
                }
                next(err, httpResponse, body);
            });
        },
    ], callback); 
};

userSchema.methods.steamRequest = function(options, callback) {
    var self = this;
    var defaults = {
        encoding: "UTF-8",
        qs: {
            "key": config.steamKey,
            "format": "json"
        }
    };
    if(_.has(options, "qs"))
        _.defaults(options.qs, defaults.qs);
        
    _.defaults(options, defaults);
    request(options, function(err, httpResponse, body) {
        console.log(options);
        if(body && options.qs.format == "json") {
            body = JSON.parse(body);
        }
        console.log(body);
        callback(err, httpResponse, body);
    });
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
            client_id: config.twitchId,
            client_secret: secrets.twitchSecret,
            grant_type: "authorization_code",
            redirect_uri: require("../app").locals.twitchRedirectUri,
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

userSchema.methods.updateTwitchInfo = function(callback) {
  var self = this;
  if(!self.lastTwitchInfoUpdate || 
    Date.now() - self.lastTwitchInfoUpdate.getTime() >= config.twitchInfoExpires * 60000) {
        self.twitchRequest({
            url: urls.twitchApi.user(),
            method: "GET"
        }, $.onError(callback, function(httpResponse, body) {
            if(body) {
                self.twitchId = body._id;
                self.twitchName = body.name;
                self.twitchDisplayName = body.display_name;
                self.lastTwitchInfoUpdate = Date.now();
                self.twitchLogoUrl = body.logo;
            }
            callback(null, true);
        }));
    }
    else
        callback(null, false);
};

userSchema.methods.updateSteamInfo = function(callback) {
    var self = this;
    if(!self.lastSteamInfoUpdate ||
        Date.now() - self.lastSteamInfoUpdate.getTime() >= config.twitchInfoExpires * 600000) {
        self.steamRequest({
            url: urls.steamApi.playerSummaries,
            qs: {
                "steamids": self.steamId
            }
        }, $.onError(callback, function(httpresponse, body) {
            if(body) {
                var player = body.response.players[0]
                self.steamProfileUrl = player.profileurl;
                self.steamDisplayName = player.personaname;
                self.steamAvatar = player.avatar;
                self.lastSteamInfoUpdate = Date.now();
            }
            callback(undefined, true);
            return;
        }));
    }
    else
        callback(undefined, false);
    return;
}


var getSubOrFollowHelper = function(model, expireTime, urlFunc) {
    return function(user, callback) {
        var self = this;
        model.findOne({channel: self._id, user: user._id}, function(err, obj) {
            if(err) {
                callback(err);
                return;
            }
            if(obj) {
                var diff = Math.abs(Date.now().getTime() - obj.createdAt.getTime());
                if(diff / 3600000 < expireTime) {
                    callback(null, obj);
                    return;
                }
            }
            this.twitchRequest(
                { 
                    url: urlFunc(self.twitchName, user.twitchName) 
                },
                function(err, httpResponse, body) {
                    if(httpResponse.statusCode == 404) {
                        if(obj)
                            obj.remove(function(err) { callback(err); });
                    }
                    else if (err) {
                        callback(err);
                    }
                    else {
                        model.create(body, callback)
                    }
                }
            );
        }); 
    };
};

userSchema.methods.getSubscription = getSubOrFollowHelper(
    Subs, config.subCheckExpires, urls.twitchApi.checkSubscription);
userSchema.methods.getFollow = getSubOrFollowHelper(
    Follows, config.followCheckExpires, urls.twitchApi.checkFollow);


module.exports = mongoose.model('User', userSchema);