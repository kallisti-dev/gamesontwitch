'use strict'
var Args = require("args-js");
module.exports = function(model, fields) {
    return function(schema) {
        return schema.pre('remove', function(next) {
            var self = this;
            fields.split(' ').forEach(function(field) {
                var condition = {};
                condition[field] = self._id;
                model.remove(condition).exec();
            });
            next();
        });
    }
};