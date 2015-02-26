'use strict';
var $ = require("./utils");
var _ = require("underscore");
var async = require("async");

//priority queue implementation using binary tree represented as array

var PQ = module.exports = function(heap, prioritySettings) {
    this.heap = heap.slice();
    this.settings = prioritySettings.slice();
};

PQ.prototype.getCompareVal = function(i, item, callback) {
    this.settings[i].getCompareVal(item, callback);
};

PQ.prototype.compare = function(a, b, callback, i) {
    var self = this;
    if(!i) i = 0;
    if(i >= this.settings.length) {
        callback(null, 0);
        return;
    }
    async.map([a, b], _.bind(this.getCompareVal, this, i), $.onError(callback, function(res) {
        var a = res[0], 
            b = res[1], 
            c = b > a? 1 : (a > b? -1 : 0);
        if(c) { 
            callback(null, c);
        }
        else { 
            self.compare(a, b, callback, i+1);
        }
    }));
};

PQ.prototype.rebalance = function(cb) {
    var self = this;
    var items = self.heap;
    self.heap = [];
    async.each(items, _.bind(self.enqueue, self), cb);
};

//enqueue operation. async callback will be called
//when queue has been properly rebalanced or when an error has occurred.
//subsequent enqueue/dequeue calls should only be made after heap has been rebalanced.
//
//If an error occurs, the first parameter to the callback will be the error object, and the second will be
//a callback to resume balancing the queue.
PQ.prototype.enqueue = function(x, callback) {
    var self = this;;
    var heap = self.heap.slice();
    if(!callback) callback = function() { };
    var balanceHeap = function(nodeInd, cb) {
        var resumeCb = function(cb) { return balanceHeap(nodeInd, cb); } 
        var parentInd = Math.floor((nodeInd-1)/2);
        if(nodeInd > 0) {
            self.compare(heap[nodeInd], heap[parentInd], function(err, res) {
                if(err) {
                    cb(err, resumeCb);
                }
                else if(res < 0) {
                    var temp = heap[nodeInd];
                    heap[nodeInd] = heap[parentInd];
                    heap[parentInd] = temp;
                    balanceHeap(parentInd, cb);
                }
                else {
                    self.heap = heap;
                    cb();
                }
            });
        }
        else {
            self.heap = heap;
            cb();
        }
    };
    heap.push(x);
    _.defer(balanceHeap, heap.length - 1, callback);
};


//dequeue operation. result is synchronous but optional async callback will be called
//when queue has been properly rebalanced or when an error has occurred.
//subsequent enqueue/dequeue calls should only be made after heap has been rebalanced.
//
//If an error occurs, the first parameter to the callback will be the error object, and the second will be
//a callback to resume balancing the queue.
PQ.prototype.dequeue = function(callback) {
    return this.remove(0, callback);
};

PQ.prototype.remove = function(i, callback) {
    var self = this;
    var heap = this.heap.slice();
    if(!callback) callback = function() { };
    if(i < 0 || i >= heap.length) {
        callback(
            new Error("Index " + i + " out of bounds (heap size: " + heap.length + ")"),
            function resumeCb(cb) { self.remove(i, cb); }
        );
        return;
    }
    var result;
    if(heap.length == 1) {
        result = heap.pop();
        self.heap = heap;
        callback(null, result);
        return;
    }
    result = heap[i];
    heap[i] = heap.pop(); //replace removed element with the last element
    var balanceHeap = function(nodeInd, cb) {     //async recursive heap balancing function
        var resumeCb = function(cb) { balanceHeap(nodeInd, cb); };
        var leftInd = 2*nodeInd + 1,
            rightInd = 2*nodeInd + 2;
        if(rightInd < heap.length && leftInd < heap.length) {
            async.detect([leftInd, rightInd], //async test: (heap[leftInd] OR heap[rightInd]) < heap[nodeInd] 
                function(i, detect) {
                    self.compare(heap[i], heap[nodeInd], function(err, r) {
                        if(err) {
                            cb(err, resumeCb);
                            return;
                        }
                        detect(r < 0); 
                    });
                },
                function(success) {
                    if(!success) {
                        self.heap = heap;
                        cb(null, result); 
                        return; 
                    }
                    var childInd;
                    self.compare(heap[rightInd], heap[leftInd], function(err, r) {
                        if(err) {
                            cb(err, resumeCb);
                            return;
                        }
                        if(r < 0) childInd = leftInd;
                        else childInd = rightInd
                        //swap parent with its child
                        var temp = heap[nodeInd];
                        heap[nodeInd] = heap[childInd];
                        heap[childInd] = temp;
                        balanceHeap(childInd, cb);
                    });            
            });
        }
        else {
            self.heap = heap;
            cb(null, result);
        }
    };
    _.defer(balanceHeap, i, callback);
    return result;
};

//creates a copy of the priority queue. the internal heap is copied but
PQ.prototype.copy = function() {
    return new PQ(this.heap, this.settings);
};

//traverses prio queue in removal order
PQ.prototype.forEach = function(cb, after) {
    var pqCopy = this.copy();
    async.whilst(
        function() { return pqCopy.heap.length > 0; },
        function(next) { pqCopy.dequeue($.finallyDo(next, cb)); },
        after
    );
};

PQ.prototype.map = function(f, after) {
    var arr = [];
    this.forEach(
        function(x) {arr.push(f(x)); },
        function(err) { after(err, arr); }
    );
};

PQ.prototype.toArray = function() {
    return this.map(_.identity);
};
