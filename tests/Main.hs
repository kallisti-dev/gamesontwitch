{-# LANGUAGE OverloadedStrings #-}
module Main where

import Test.Hspec.WebDriver
import Control.Monad
import Data.Text
import Network.Socket (withSocketsDo)

--primary user for tests
user = "gamesontwitch1"
pass = "11235813"

accounts :: [(Text, Text)]
accounts = [ (user, pass)
           , ("gamesontwitch2", pass)
           , ("gamesontwitch3", pass)
           ]

twitchLogin :: Text -> Text -> WD ()
twitchLogin user pass = do
    click <=< findElem . ByClass $ "connect-button"
    sendKeys user <=< findElem . ById $ "user_login"
    sendKeys pass <=< findElem . ById $ "user_password"
    click <=< findElem . ById $ "oauth_submit"
    url <- getCurrentURL
    unless (url == "http://twitch.tv/dashboard") $
        click <=< findElem . ByCSS $ "button[type=\"submit\"]"
    
    
    
main :: IO ()
main = withSocketsDo . hspec $ do
    session "gamesontwitch" . using Chrome $ do
        it "logs in" . runWD $ do
            openPage "http://gamesontwitch.tv"
            twitchLogin user pass