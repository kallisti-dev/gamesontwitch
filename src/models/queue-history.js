'use strict';

var _ = require("underscore");
var async = require("async");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var findOneOrCreate = require("../mongoose-plugins/find-one-or-create");
var cascadeDeletes = require("../mongoose-plugins/cascading-deletes");

var schemaTypes = require("./schema-types");
var Ref = schemaTypes.Ref;
var DefaultDate = schemaTypes.DefaultDate;

/* QueueHistory schema */
var queueHistorySchema = new Schema({
    user:  Ref("User"),
    queue: Ref("Queue"),
    gamesPlayed: {type: Number, default: 0, min: 0},
    queued: {type: Boolean, default: false},
    lastPlayed: Date,
    lastJoined: DefaultDate
})
.plugin(findOneOrCreate)
//compound unique index over queue and user IDs
.index({queue: 1, user: 1}, {unique: true});

module.exports = mongoose.model("QueueHistory", queueHistorySchema);