'use strict'
var _ = require("underscore");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var findOneOrCreate = require("../mongoose-plugins/find-one-or-create");

var schemaTypes = require("./schema-types");
var Ref = schemaTypes.Ref;
var DefaultDate = schemaTypes.DefaultDate;

function mkSchema() {
    return new Schema({
    user: Ref('User'),
    channel: Ref('User'),
    createdAt: schemaTypes.DefaultDate
    })
    .plugin(findOneOrCreate)
    .index({user: 1, channel: 1}, {unique: true});
};



module.exports.Subs = mongoose.model("Subs", mkSchema());
module.exports.Follows = mongoose.model("Follows", mkSchema());
    