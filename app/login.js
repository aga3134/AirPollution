var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var swig = require("swig");
var Config = require('../config');
var mysqlDB = require("./mysqlDB");

var login = {};

login.Init = function(passport) {

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
		done(null,user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
		mysqlDB.User.findOne({where: {id:id}}).then(function(user){
			done(null,user);
        });
    });

    passport.use(new GoogleStrategy({
        clientID        : Config.googleAuth.clientID,
        clientSecret    : Config.googleAuth.clientSecret,
        callbackURL     : Config.googleAuth.callbackURL,
    },
    function(token, refreshToken, profile, done) {
        // make the code asynchronous
        // User.findOne won't fire until we have all our data back from Google
        process.nextTick(function() {
            //if(!profile.emails) return done(null,false);

            mysqlDB.User.findOne({where: {
                $and: {'provider' : 'google', 'oauthID' : profile.id}}
            }).then(function(user) {
                if (user) {
					//console.log("find user in Google "+profile.displayName);
                    return done(null,user);
                }
                else {
					//console.log("add user in Google "+profile.displayName);
                    var newUser = {};
                    newUser.provider = "google";
                    newUser.oauthID = profile.id;
                    newUser.oauthToken = token;
                    if(profile.name){
                        newUser.name = profile.name.familyName+profile.name.givenName;
                    }
                    if(profile.emails){
                        newUser.email = profile.emails[0].value;
                    }
                    
                    mysqlDB.User.create(newUser).then(function(user) {
                        return done(null,user);
                    });
                }
            });
        });

    }));

};

module.exports = login;