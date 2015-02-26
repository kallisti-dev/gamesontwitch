'use strict';

var _ = require("underscore");
var $ = require("../utils");
var log = require('../log');
var async = require("async");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var User = require("./user");
var QueueHistory = require("./queue-history");

var findOneOrCreate = require("../mongoose-plugins/find-one-or-create");
var cascadeDeletes = require("../mongoose-plugins/cascading-deletes");

var schemaTypes = require("./schema-types");

var pq = require("../pq");


/* Queue Schema */
var queueSchema = new Schema({
    dateCreated: schemaTypes.DefaultDate,
    owner: schemaTypes.Ref("User"),
    name: String,
    requireSub: Boolean,
    requireFollow: Boolean,
    prioritySettings: {type: [schemaTypes.PrioritySetting]},
    heap: { type: [schemaTypes.Ref("QueueHistory")], 
            default: function() { return []; } },
})
.plugin(findOneOrCreate)
.plugin(cascadeDeletes, {model: QueueHistory, fields: "queue"});


queueSchema.methods.getUsers = function(callback) {
    if(this.heap) {
        async.map(this.heap, function(hId, next) { 
            QueueHistory.findById(hId).populate("user").exec(function(err, h) { 
                if(err) next(err)
                else next(err, h.user); 
            });
        }, callback);
    }
    else {
        callback(err, []);
    }
};

queueSchema.methods.join = function(user, callback) {
    var self = this;
    QueueHistory.findOneOrCreate({user: user._id, queue: self._id}, $.onError(callback, function(history) {
        if(history.queued) { callback(null, history); return; }
        self.withPQ($.onError(callback, function(pq, savePQ) {
            console.log(pq);
            pq.enqueue(history._id, $.onError(callback, function() {
                history.lastJoined = Date.now();
                history.queued = true;
                savePQ();
                callback(null, history);
            }));
        }));
    }));
};

queueSchema.methods.unjoin = function(user, callback) {
    var self = this;
    QueueHistory.findOneOrCreate({user: user._id, queue:self._id}, $.onError(callback, function(history) {
        if(!history.queued) { callback(null, history); return }
        
        for(var i = 0; i < self.heap.length; ++i) {
            if(self.heap[i].equals(history._id)) {
                self.withPQ($.onError(callback, function(pq, savePQ) {
                    //TODO: handle errors and resume rebalancing
                    pq.remove(i, function(err, resumeCb) {
                        if(err) {
                            callback(err, resumeCb, savePQ);
                            return;
                        }
                        history.queued = false;
                        savePQ();
                        callback(null, history);
                    });
                }));
                return;
            }
        }
        var err = new Error("history.queued was true, but ID was not found in heap");
        err.historyId = history._id;
        err.pqId = pq._id;
        callback(err);
    }));
}

queueSchema.methods.getPQ = function(callback) {
    return this.populate("heap heap.user heap.queue heap.queue.owner", function(err, q) {
        callback(err, new pq(q.heap, q.prioritySettings));
    });
};

queueSchema.methods.setPQ = function(pq) {
    this.heap = pq.heap;
    this.prioritySettings = pq.settings;
};

queueSchema.methods.withPQ = function(cb) {
    var self = this;
    self.getPQ(function(err, pq) {
        cb(err, pq, function() { self.setPQ(pq); });
    });
};

module.exports = mongoose.model("Queue", queueSchema);