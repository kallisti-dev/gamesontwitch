//all local URIs are relative
var twitchRoot = "https://api.twitch.tv/kraken";
module.exports = {
    home: "/",
    dashboard: "/dashboard",
    authTwitch: "/auth/twitch",
    authSteam: "/auth/steam",
    queue: {
        display: function(qId) { return "/queue/" + qId; },
        settings: function(qId) { return "/queue/" + qId + "/settings"; },
        join: function(qId) { return "/queue/" + qId + "/join"; },
        create: "/queue/create",
        delete: function(qId) { return "/queue/" + qId+ "/delete"; },
    },

    twitchApi: {
        authorize: twitchRoot + "/oauth2/authorize",
        accessToken: twitchRoot + "/oauth2/token",
        checkSubscription: function(c, u) { return twitchRoot + "/channels/"+c+"/subscriptions/"+u; },
        checkFollow: function(c, u) { return twitchRoot + "/users/" + u + "/follows/channels/" + c; } 
    },
    steamApi: {
        authorize: "https://steamcommunity.com/openid/login"
    }  
};