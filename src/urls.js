var twitchRoot = "https://api.twitch.tv/kraken";
var steamRoot  = "https://api.steampowered.com";

//all local URIs are relative
var urls = {
    home: "/",
    dashboard: "/dashboard",
    authTwitch: "/auth/twitch",
    authSteam: "/auth/steam",
    logout: "/auth/logout",
    scripts: {
        urls: "/javascripts/urls.js",
        ui: "/javascripts/ui.js",
        prioritySettingsList: "/javascripts/priority-settings-list.js"
    },
    
    queue: {
        display: function(qId) { return "/queue/" + qId; },
        settings: function(qId) { return "/queue/" + qId + "/settings"; },
        join: function(qId) { return "/queue/" + qId + "/join"; },
        unjoin: function(qId) { return "/queue/" + qId + "/unjoin"; },
        create: "/queue/create",
        delete: function(qId) { return "/queue/" + qId+ "/delete"; },
    },

    twitchApi: {
        authorize: twitchRoot + "/oauth2/authorize",
        accessToken: twitchRoot + "/oauth2/token",
        checkSubscription: function(c, u) { return twitchRoot + "/channels/"+c+"/subscriptions/"+u; },
        checkFollow: function(c, u) { return twitchRoot + "/users/" + u + "/follows/channels/" + c; },
        user: function(u) { return twitchRoot + (u? "/users/" + u : "/user") ; }        
    },
    
    steamApi: {
        authorize: "https://steamcommunity.com/openid/login",
        playerSummaries: steamRoot + "/ISteamUser/GetPlayerSummaries/v0002/"
    }  
};

if(typeof window === 'undefined')
    module.exports = urls;
