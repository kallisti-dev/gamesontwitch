'use strict';
var mongoose = require("mongoose");
var async


module.exports = {
    //foreign key type
    Ref: function(model) { return {type: mongoose.SchemaTypes.ObjectId, ref: model}; },
    
    //timestamp with default to current time
    DefaultDate: {type: Date, default: Date.now},
    
    //schematype for priority queue settings
    PrioritySetting: {
        type: Number,
        get: function(n) {
            if(n != null) {
                for(name in PrioritySettingEnum) {
                    var obj = PrioritySettingEnum[name];
                    if(obj.val == n) {
                        obj.name = name;
                        return obj;
                    }
                }
            }
            throw new Error("numeric PrioritySetting value of " + n + " is not valid.");
        },
        set: function(obj) {
            var res = PrioritySettingEnum[obj.name];
            if(res) {
                return res.val;
            }
            throw new Error("PrioritySetting enum value " + obj.name + " is not valid.");
        }
    }
};


//enum to specify priority queue settings
var PrioritySettingEnum = {
    games: {val: 0, getCompareVal: function(hist, callback) {
        callback(null, hist.gamesPlayed);
    }},
    sub: {val: 1, getCompareVal: function(hist, callback) {
        hist.queue.owner.getSubscription(hist.user, function(err, sub) {
            if(sub) sub = sub.created_at;
            callback(err, sub);
        });
    }},
    follow: {val: 2, getCompareVal: function(hist, callback) {
        hist.queue.owner.getFollow(hist.user, function(err, follow) {
            if(follow) follow = follow.created_at;
            callback(err, follow);
        });
    }}
};
