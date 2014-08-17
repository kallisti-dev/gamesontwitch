'use strict';
var $ = require("./utils");
var _ = require("underscore");
var async = require("async");

//priority queue implementation using binary tree represented as array

var PQ = module.exports = function(heap, prioritySettings, cache) {
    this.heap = heap;
    this.settings = prioritySettings;
    this.cache = cache || {};
};

PQ.prototype.getCompareVal = function(i, item, callback) {
    var x;
    if (this.cache[item] && (x = this.cache[item][i])) {
        callback(null, x);
        return;
    }
    this.settings[i].getCompareVal(item, function(err, result) {
        if(result) {
            if(!this.cache[item]) this.cache[item] = {};
            this.cache[item][i] = result;
        }
        callback(err, result);
    });  
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

PQ.prototype.clearCache = function() {
    for(var key in this.cache) {
        delete this.cache[member];
    }
};

//enqueue operation. returns synchronously but optional async callback will be called
//when queue has been properly rebalanced or when an error has occurred.
//
//subsequent enqueue/dequeue calls should only be made after heap has been rebalanced.
PQ.prototype.enqueue = function(x, callback) {
    var self = this;;
    var heap = self.heap;
    if(!callback) callback = function() { };
    var balanceHeap = function(nodeInd) {
        var parentInd = Math.floor((nodeInd-1)/2);
        if(nodeInd > 0) {
            self.compare(heap[nodeInd], heap[parentInd], $.onError(callback, function(res) {
                if(res < 0) {
                    var temp = heap[nodeInd];
                    heap[nodeInd] = heap[parentInd];
                    heap[parentInd] = temp;
                    balanceHeap(parentInd);
                }
                else callback(null);
            }));
        }
        else callback(null);
    };
    heap.push(x);
    balanceHeap(heap.length - 1);
};


//dequeue operation. result is synchronous but optional async callback will be called
//when queue has been properly rebalanced or when an error has occurred.
//
//subsequent enqueue/dequeue calls should only be made after heap has been rebalanced.
PQ.prototype.dequeue = function(callback) {
    var self = this;
    var heap = this.heap;
    if(!callback) callback = function() { };
    if(heap.length == 1) {
        callback(null, heap.pop());
        return;
    }
    var result = heap[0];
    heap[0] = heap.pop();
    //async recursive heap balancing function
    var balanceHeap = function(nodeInd) {
        var leftInd = 2*nodeInd + 1,
            rightInd = 2*nodeInd + 2;
        if(rightInd < heap.length && leftInd < heap.length) {
            async.detect([leftInd, rightInd], //async test: (heap[leftInd] OR heap[rightInd]) < heap[nodeInd] 
                function(i, detect) {
                    self.compare(heap[i], heap[nodeInd], 
                        $.onError(callback, function(result) { detect(result < 0); }))
                },
                function(success) {
                    if(!success) { callback(null, result); return; }
                    var childInd = rightInd;
                    self.compare(heap[rightInd], heap[leftInd], $.onError(callback, function(result) {
                        if(result < 0) childInd = leftInd;
                        var temp = heap[nodeInd];
                        heap[nodeInd] = heap[childInd];
                        heap[childInd] = temp;
                        balanceHeap(childInd);
                    }));            
            });
        }
        else callback(null, result);
    };
    balanceHeap(0);
    return result;
};

//creates a copy of the priority queue. the internal heap is copied but the sort functions
//and cache are shared between copies.
PQ.prototype.copy = function() {
    return new PQ(this.heap.slice(), this.settings, this.cache);
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
