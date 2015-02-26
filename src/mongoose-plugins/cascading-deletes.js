'use strict'
var async = require("async");
module.exports = function(schema, options) {
    schema.pre('remove', function(done) {
        var self = this;
        async.each(options.fields.split(' '), function(field, next) {
            var condition = {};
            condition[field] = self._id;
            options.model.remove(condition).exec();
            next();
        }, done);
    });
};