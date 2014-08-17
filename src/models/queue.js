'use strict';

var _ = require("underscore");
var $ = require("../utils");
var async = require("async");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var QueueHistory = require("./queue-history");

var findOneOrCreate = require("../mongoose-plugins/find-one-or-create");
var cascadeDeletes = require("../mongoose-plugins/cascading-deletes");

var schemaTypes = require("./schema-types");
var Ref = schemaTypes.Ref;
var DefaultDate = schemaTypes.DefaultDate;

var pq = require("../pq");


/* Queue Schema */
var queueSchema = new Schema({
    owner: Ref("User"),
    name: String,
    requireSub: Boolean,
    requireFollow: Boolean,
    prioritySettings: [schemaTypes.PrioritySetting],
    heap: { type: [Ref("QueueHistory")], default: _.constant([])},
    dateCreated: DefaultDate
})
.plugin(findOneOrCreate)
.plugin(cascadeDeletes(QueueHistory, "queueId"));


queueSchema.methods.getUsers = function(callback) {
    this.populate("heap.user", function(err, queue) {
        if(queue) {
            callback(err, _.pluck(queue.heap, "user"));
        }
        else {
            callback(err);
        }
    });
};

queueSchema.methods.join = function(user, callback) {
    var self = this;
    QueueHistory.findOneOrCreate({user: user._id, queue: self._id}, $.onError(callback, function(history) {
        if(history.queued) { callback(null, history); return; }
        self.getPQ($.onError(callback, function(pq) {
            pq.enqueue(history._id, $.onError(callback, function() {
                history.lastJoined = Date.now();
                history.queued = true;
                callback(null, history);
            }));
        }));
    }));
};

queueSchema.methods.getPQ = function(callback) {
    return this.populate("heap heap.user heap.queue heap.queue.owner", function(err, q) {
        callback(err, new pq(q.heap, q.prioritySettings));
    });
};

queueSchema.methods.setPQ = function(pq) {
    return this.set("heap", pq.heap);
};

//async priority queue comparator
queueSchema.methods.comparator = function(a, b, callback) {
    var self = this;
};

module.exports = mongoose.model("Queue", queueSchema);