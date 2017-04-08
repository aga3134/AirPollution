var express = require("express");
var swig = require("swig");
var mongoose = require("mongoose");
var route = require("./app/route.js");
var registerTask = require("./app/registerTask");
var Config = require('./config');
var cookieParser = require("cookie-parser");
var session = require("express-session");
var passport = require("passport");

mongoose.connect("mongodb://localhost/AirPollution");
mongoose.Promise = global.Promise;

var app = express();
app.engine("html", swig.renderFile);
app.set("view engine", "html");
app.set("views", __dirname);
app.port = Config.serverPort;
app.host = "localhost";
app.use('/static',express.static(__dirname + '/static'));

//debug用，上線之後要關掉
app.set("view cache", false);
swig.setDefaults({cache: false});

app.use(cookieParser());
app.use(session({
	secret: Config.sessionConfig.secret,
	cookie: { path: '/', httpOnly: true, maxAge: 1000*60*60*24*100}	//session保留100天
}));

app.use(passport.initialize());
app.use(passport.session());

route(app, passport);
registerTask.InitTask();

process.on('exit',function(){
	mongoose.connection.close();
});

app.listen(app.port, app.host);
console.log("AirPollution Server started");
