var express = require("express");
var swig = require("swig");
var mongoose = require("mongoose");
var route = require("./app/route.js");
var registerTask = require("./app/registerTask");
var Config = require('./config');
var cookieParser = require("cookie-parser");
var session = require("express-session");
var MySQLStore = require('express-mysql-session')(session);
var passport = require("passport");
var childProcess = require('child_process');

mongoose.connect("mongodb://localhost/AirPollution", {
  server: {
    socketOptions: {
      socketTimeoutMS: 0,
      connectTimeoutMS: 0
    }
  }
});
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

var options = {
    host: 'localhost',
    port: 3306,
    user: Config.mysqlAuth.username,
    password: Config.mysqlAuth.password,
    database: Config.mysqlAuth.dbName
};
var sessionStore = new MySQLStore(options);
 
app.use(session({
    secret: Config.sessionConfig.secret,
    store: sessionStore,
    resave: true,
    saveUninitialized: true,
    cookie: {
      sameSite: 'strict',
      httpOnly: true,
      secure: true
    }
}));
/*app.use(session({
	secret: Config.sessionConfig.secret,
	cookie: { path: '/', httpOnly: true, maxAge: 1000*60*60*24*100}	//session保留100天
}));*/

app.use(passport.initialize());
app.use(passport.session());

route(app, passport);
registerTask.InitTask();
/*
console.log("create a child process to add data to db");
var cp = childProcess.fork("./updateDB.js");
cp.on('error', function (err) {
    console.log("child process error: "+err);
});
cp.on('exit', function (code) {
    console.log("child process exit: "+code);
});*/

process.on('error',function(err){
  console.log("process error: "+err);
});

process.on('exit',function(code){
  console.log("process exit: "+code);
	mongoose.disconnect();
});

app.listen(app.port, app.host);
console.log("AirPollution Server started");
