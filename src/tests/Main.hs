module Main where

import WebDriver


chromeCaps = defaultCaps {browser = chrome}

chromeConf = defaultConfig {wdCapabilities = chromeConf}

accounts = [ ("gamesontwitch1", "11234513")
           , ("gamesontwitch2", "11235813")
           , ("gamesontwitch3", "11235813")
           ]

login :: String -> String -> WD ()
login user pass = do
    click <=< findElem . ByClass $ "twitch-connect-button"
    sendKeys <=< findElem . ById "user_login" $ user
    sendKeys <=< findElem . ById "user_password" $ pass
    click <=< findElem . ById $ "oauth_submit"
    
    
mainTest :: WD ()
mainTest = do
    forM accounts $ \(user, pass) -> do
        openPage "http://gamesontwitch.tv"
        login user pass