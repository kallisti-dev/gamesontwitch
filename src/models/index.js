'use strict';

var m = require("./subscriptions-and-follows.js");

module.exports = {
    User: require('./user'),
    Queue: require('./queue'),
    QueueHistory: require('./queue-history'),
    Subs: m.Subs,
    Follows: m.Follows
};
    