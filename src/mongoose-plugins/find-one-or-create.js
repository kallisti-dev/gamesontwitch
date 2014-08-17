'use strict';
var Args = require("args-js");

module.exports = function(schema) {
    schema.statics.findOneOrCreate = function findOneOrCreate() {
        var self = this;
        var args = Args([
            {cond:     Args.OBJECT     | Args.Required},
            {doc:      Args.OBJECT     | Args.Optional},
            {callback: Args.FUNCTION   | Args.Optional}
        ], arguments);
        return self.findOne(args.cond, function(err, result) {
            if (result) {
                args.callback(err, result);
            } 
            else {
                self.create(args.doc || args.cond, args.callback);
            }
        });
    };
};