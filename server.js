var express = require("express");
var swig = require("swig");
var mongoose = require("mongoose");
var route = require("./app/route.js");
var registerTask = require("./app/registerTask");


mongoose.connect("mongodb://localhost/AirPollution");
mongoose.Promise = global.Promise;

var app = express();
app.engine("html", swig.renderFile);
app.set("view engine", "html");
app.set("views", __dirname);
app.port = 8001;
app.host = "localhost";


//debug用，上線之後要關掉
app.set("view cache", false);
swig.setDefaults({cache: false});

route(app);
registerTask.InitTask();

process.on('exit',function(){
	mongoose.connection.close();
});

app.listen(app.port, app.host);
console.log("AirPollution Server started");
