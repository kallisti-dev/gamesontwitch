'use strict';
var mongoose = require("mongoose");
var util = require("util");


function PriorityEnum(name, getCompareVal) {
    this.name = name;
    this.getCompareVal = getCompareVal;
}

/* SchemaType for queue priorities */
function PrioritySetting(path, options) {
    mongoose.SchemaType.call(this, path, options, 'PrioritySetting');
    this.get(function(val) {
        var result = typeof val === 'string' && PrioritySetting.setting[val]
                  || val instanceof PriorityEnum && val;
        if(result)
            return result;
        else
            throw new Error("Invalid value for type PrioritySetting: " + val);
    });
};

util.inherits(PrioritySetting, mongoose.SchemaType);

PrioritySetting.settings = {};

PrioritySetting.add = function(name, getCompareVal) {
    PrioritySetting.settings[name] = getCompareVal;
};

PrioritySetting.add('games', function(hist, callback) {
    callback(null, hist.gamesPlayed); 
});

PrioritySetting.add('subs', function(hist, callback) {
    hist.queue.owner.getSubscription(hist.user, function(err, sub) {
        if(sub) sub = sub.createdAt;
        callback(err, sub);
    });
});

PrioritySetting.add('follows', function(hist, callback) {
    hist.queue.owner.getFollow(hist.user, function(err, follow) {
        if(follow) follow = follow.createdAt;
        callback(err, follow);
    });
});

PrioritySetting.prototype.cast = function(val, doc, init) {
    var s;
    if(val instanceof PriorityEnum)
        s = val.name;
    else if (typeof val === 'string')
        s = val;
    if(s && PrioritySetting.settings[s]) {
        return s
    }
    else {
        throw new mongoose.SchemaType.CastError('PrioritySetting', val, this.path);
    }       
};


function handleSingle (val) {
    return this.cast(val)
}

function handleArray (val) {
    var self = this;
    return val.map( function (m) {
      return self.cast(m)
    });
}

PrioritySetting.prototype.$conditionalHandlers = {
  '$lt' : handleSingle
, '$lte': handleSingle
, '$gt' : handleSingle
, '$gte': handleSingle
, '$ne' : handleSingle
, '$in' : handleArray
, '$nin': handleArray
, '$mod': handleArray
, '$all': handleArray
};

PrioritySetting.prototype.castForQuery = function ($conditional, value) {
    var handler;
    if (2 === arguments.length) {
      handler = this.$conditionalHandlers[$conditional];
      if (!handler) {
          throw new Error("Can't use " + $conditional + " with Long.");
      }
      return handler.call(this, value);
    } else {
      return this.cast($conditional);
    }
}


module.exports = {
    //foreign key type
    Ref: function(model) { return {type: mongoose.SchemaTypes.ObjectId, ref: model}; },
    
    //timestamp with default to current time
    DefaultDate: {type: Date, default: Date.now},
    
    PrioritySetting: PrioritySetting
};
