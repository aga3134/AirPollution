
var PowerLoad = require('../db/powerLoad');
var PowerRatio = require('../db/powerRatio');
var PowerStation = require('../db/powerStation');
var Sensor10minSum = require('../db/sensor10minSum');
var SensorDailySum = require('../db/sensorDailySum');
var SensorSite = require('../db/sensorSite');
var WeatherStation = require('../db/weatherStation');
var RoadSegment = require('../db/roadSegment');

var formidable = require('formidable');
var uuid = require('node-uuid');
var mysqlDB = require("./mysqlDB");
var Login = require("./login.js");
var Config = require("../config.js");

//一天的data存成一個collection，必免資料太大存取很慢
var mongoose = require('mongoose');
var PowerGenSchema = require('../db/powerGenSchema');
//var SensorDataSchema = require('../db/sensorDataSchema');
var SensorGridSchema = require('../db/sensorGridSchema');
var WeatherDataSchema = require('../db/weatherDataSchema');
var RoadDataSchema = require('../db/roadDataSchema');
var version = "1.1.0";

module.exports = function(app, passport){
	mysqlDB.Init();
	Login.Init(passport);

	app.get("/", GetCurUser, function(req, res){
		var user = req.userInfo;
		res.render("static/index.html", {user: user, version: version});
	});
	
	/*app.get("/sensorSite", function(req, res){
		SensorSite.find({},{'__v': 0}, function(err, sites){
			if(err) console.log(err);
			res.send(JSON.stringify(sites));
		});
	});

	app.get("/sensorData", function(req, res){
		var date = req.query.date;
		var hour = parseInt(req.query.hour);
		if(!date) return;
		var conditions = [];
		var query = {};
		if(hour >= 0 && hour < 24){
			conditions.push({time: {$gte: new Date(date+" "+hour+":00")}});
			conditions.push({time: {$lte: new Date(date+" "+hour+":59")}});
			query.$and = conditions;
		}

		//use lean to allow modify of time
		var t = date.replace(/\//g,"_");
		var SensorData = mongoose.model('SensorData_'+t, SensorDataSchema);
		SensorData.find(query, { '_id': 0, '__v': 0, 'h': 0, 't': 0}).lean().exec(function(err, data){
			if(err) console.log(err);
			if(!data) return;
			for(var i=0;i<data.length;i++){
				data[i].time = DateToTimeString(data[i].time);
			}
			res.send(JSON.stringify(data));
		});
	});*/

	app.get("/sensorGrid", function(req, res){
		var gridPerUnit = Config.gridPerUnit;
		var levelNum = Config.levelNum;
		var date = req.query.date;
		var hour = parseInt(req.query.hour);
		var level = parseInt(req.query.level);
		var minLat = parseFloat(req.query.minLat);
		var maxLat = parseFloat(req.query.maxLat);
		var minLng = parseFloat(req.query.minLng);
		var maxLng = parseFloat(req.query.maxLng);
		if(!date || !req.query.level || level < 0 || level >= levelNum) return;

		var query = {"level": level};
		var condition = [];
		if(hour >= 0 && hour < 24){
			condition.push({'time': {$gte: new Date(date+" "+hour+":00")}});
			condition.push({'time': {$lte: new Date(date+" "+hour+":59")}});
		}

		var scale = gridPerUnit/Math.pow(2,level);
		var interval = 1.0/scale;
		if(minLat) condition.push({'gridY': {$gte: minLat*scale}});
		if(maxLat) condition.push({'gridY': {$lte: maxLat*scale}});

		if(minLng) condition.push({'gridX': {$gte: minLng*scale}});
		if(maxLng) condition.push({'gridX': {$lte: maxLng*scale}});

		if(condition.length > 0){
			query.$and = condition;
		}

		//use lean to allow modify of time
		var t = date.replace(/\//g,"_");
		var SensorGrid = mongoose.model('SensorGrid_'+t, SensorGridSchema);
		SensorGrid.find(query, { '_id': 0, '__v': 0, 'h': 0, 't': 0, 'level': 0}).lean().exec(function(err, data){
			if(err) console.log(err);
			if(!data) return;
			
			var result = {};
			result.level = level;
			for(var i=0;i<data.length;i++){
				data[i].gridX = (data[i].gridX*interval).toFixed(2);
				data[i].gridY = (data[i].gridY*interval).toFixed(2);
				data[i].pm25 = Math.floor(data[i].pm25/data[i].weight);
				data[i].time = DateToTimeString(data[i].time);
				delete data[i].weight;
			}
			result.data = data;
			res.send(JSON.stringify(result));
		});
	});

	app.get("/sensorDailySum", function(req, res){
		var year = parseInt(req.query.year);
		if(!year) return;

		//get data within the year
		var conditions = [];
		conditions.push({'_id': {$gte: new Date(year+"/1/1")}});
		conditions.push({'_id': {$lte: new Date(year+"/12/31")}});
		var query   = {$and: conditions};
		SensorDailySum.find(query, {'__v': 0}).lean().exec(function(err, data){
			if(err) console.log(err);
			if(!data) return;
			for(var i=0;i<data.length;i++){
				data[i]._id = DateToDateString(data[i]._id);
				//round data to 2 digit
				if(data[i].southNum) data[i].southNum = data[i].southNum.toFixed(2);
				if(data[i].southSum) data[i].southSum = data[i].southSum.toFixed(2);
				if(data[i].centralNum) data[i].centralNum = data[i].centralNum.toFixed(2);
				if(data[i].centralSum) data[i].centralSum = data[i].centralSum.toFixed(2);
				if(data[i].northNum) data[i].northNum = data[i].northNum.toFixed(2);
				if(data[i].northSum) data[i].northSum = data[i].northSum.toFixed(2);
			}
			res.send(JSON.stringify(data));
		});
	});

	app.get("/sensor10minSum", function(req, res){
		var date = req.query.date;
		if(!date) return;

		//get data within the day
		var conditions = [];
		conditions.push({'_id': {$gte: new Date(date+" 0:0:0")}});
		conditions.push({'_id': {$lte: new Date(date+" 23:59:59")}});
		var query   = {$and: conditions};
		Sensor10minSum.find(query, {'__v': 0}).lean().exec(function(err, data){
			if(err) console.log(err);
			if(!data) return;
			for(var i=0;i<data.length;i++){
				data[i]._id = DateToTimeString(data[i]._id);
				//round data to 2 digit
				if(data[i].southNum) data[i].southNum = data[i].southNum.toFixed(2);
				if(data[i].southSum) data[i].southSum = data[i].southSum.toFixed(2);
				if(data[i].centralNum) data[i].centralNum = data[i].centralNum.toFixed(2);
				if(data[i].centralSum) data[i].centralSum = data[i].centralSum.toFixed(2);
				if(data[i].northNum) data[i].northNum = data[i].northNum.toFixed(2);
				if(data[i].northSum) data[i].northSum = data[i].northSum.toFixed(2);
			}
			res.send(JSON.stringify(data));
		});
	});

	app.get("/extremeDate", function(req, res){
		var extreme = {};
		SensorDailySum.findOne({}).sort({_id: -1}).exec(function(err, maxDate) {
			if(err) console.log(err);
			if(!maxDate) return;
			extreme.maxDate = DateToDateString(maxDate._id);
			SensorDailySum.findOne({}).sort({_id: 1}).exec(function(err, minDate) {
				if(err) console.log(err);
				if(!minDate) return;
				extreme.minDate = DateToDateString(minDate._id);
				res.send(JSON.stringify(extreme));
			});
		});
	});

	app.get("/powerStation", function(req, res){
		PowerStation.find({}, {'__v': 0}, function(err, sites){
			if(err) console.log(err);
			if(!sites) return;
			res.send(JSON.stringify(sites));
		});
	});

	app.get("/powerGen", function(req, res){
		var date = req.query.date;
		if(!date) return;

		var conditions = [];
		conditions.push({time: {$gte: new Date(date+" 00:00")}});
		conditions.push({time: {$lte: new Date(date+" 23:59")}});
		var query   = {$and: conditions};

		var t = date.replace(/\//g,"_");
		var PowerGen = mongoose.model('PowerGen_'+t, PowerGenSchema);
		PowerGen.find(query, { '_id': 0, '__v': 0}).lean().exec(function(err, data){
			if(err) console.log(err);
			if(!data) return;
			for(var i=0;i<data.length;i++){
				data[i].time = DateToTimeString(data[i].time);
			}
			res.send(JSON.stringify(data));
		});
	});

	app.get("/powerLoad", function(req, res){
		var date = req.query.date;
		if(!date) return;

		var conditions = [];
		conditions.push({_id: {$gte: new Date(date+" 00:00")}});
		conditions.push({_id: {$lte: new Date(date+" 23:59")}});
		var query   = {$and: conditions};
		PowerLoad.find(query, {'__v': 0}).lean().exec(function(err, data){
			if(err) console.log(err);
			if(!data) return;
			for(var i=0;i<data.length;i++){
				data[i]._id = DateToTimeString(data[i]._id);
			}
			res.send(JSON.stringify(data));
		});
	});

	app.get("/powerRatio", function(req, res){
		var date = req.query.date;
		if(!date) return;

		var conditions = [];
		conditions.push({_id: {$gte: new Date(date+" 00:00")}});
		conditions.push({_id: {$lte: new Date(date+" 23:59")}});
		var query   = {$and: conditions};
		PowerRatio.find(query, {'__v': 0, 'pumpLoad': 0}).lean().exec(function(err, data){
			if(err) console.log(err);
			if(!data) return;
			for(var i=0;i<data.length;i++){
				data[i]._id = DateToTimeString(data[i]._id);
			}
			res.send(JSON.stringify(data));
		});
	});

	app.get("/weatherStation", function(req, res){
		WeatherStation.find({},{'__v': 0},  function(err, sites){
			if(err) console.log(err);
			if(!sites) return;
			res.send(JSON.stringify(sites));
		});
	});

	app.get("/weatherData", function(req, res){
		var date = req.query.date;
		if(!date) return;

		var conditions = [];
		conditions.push({time: {$gte: new Date(date+" 00:00")}});
		conditions.push({time: {$lte: new Date(date+" 23:59")}});
		var query   = {$and: conditions};

		var t = date.replace(/\//g,"_");
		var WeatherData = mongoose.model('WeatherData_'+t, WeatherDataSchema);
		WeatherData.find(query, { '_id': 0, '__v': 0, 'rain': 0, 'sun': 0}).lean().exec(function(err, data){
			if(err) console.log(err);
			if(!data) return;
			for(var i=0;i<data.length;i++){
				data[i].time = DateToTimeString(data[i].time);
			}
			res.send(JSON.stringify(data));
		});
	});

	app.get("/roadSegment", function(req, res){
		RoadSegment.find({},{'__v': 0},  function(err, roads){
			if(err) console.log(err);
			if(!roads) return;
			res.send(JSON.stringify(roads));
		});
	});

	app.get("/roadData", function(req, res){
		var date = req.query.date;
		if(!date) return;

		var conditions = [];
		conditions.push({time: {$gte: new Date(date+" 00:00")}});
		conditions.push({time: {$lte: new Date(date+" 23:59")}});
		var query   = {$and: conditions};

		var t = date.replace(/\//g,"_");
		var RoadData = mongoose.model('RoadData_'+t, RoadDataSchema);
		RoadData.find(query, { '_id': 0, '__v': 0, 'speed': 0, 'travelTime': 0}).lean().exec(function(err, data){
			if(err) console.log(err);
			if(!data) return;
			for(var i=0;i<data.length;i++){
				data[i].time = DateToTimeString(data[i].time);
			}
			res.send(JSON.stringify(data));
		});
	});

	//==============================comment related========================
	app.get("/comment-list", GetCurUser, function(req, res){
		var user = req.userInfo;
		var date = req.query.date;
		if(!user) return res.send("please login");
		if(!date) return res.send("no date");

		query = {};
		query.userID = user.id;
		query.time = {$gte: new Date(date+" 00:00"), $lte: new Date(date+" 23:59")};

		mysqlDB.Comment.findAll({where: query}).then(function(comments) {
    	    res.send(comments);
    	});
	});

	app.post("/comment-add", GetCurUser, function(req, res){
		var user = req.userInfo;
		var form = new formidable.IncomingForm();
		form.parse(req, function(err, fields, files) {
			if (err) {
				console.error(err);
			}
			var newComment = {};
			newComment.id = uuid.v4();
			newComment.userID = user.id;
			newComment.time = fields.time;
			newComment.lat = fields.lat;
			newComment.lng = fields.lng;
			newComment.comment = fields.comment;
			
        	mysqlDB.Comment.create(newComment).then(function(comment) {
        		//update comment daily num
        		var date = fields.time.split(" ")[0];
        		mysqlDB.CommentDailyNum.findOne({where: {userID: user.id, date: new Date(date)}}).then(function(dailyNum){
        			if(!dailyNum){
        				var newDaily = {};
        				newDaily.userID = user.id;
        				newDaily.date = date;
        				newDaily.num = 1;
        				mysqlDB.CommentDailyNum.create(newDaily);
        				res.send(comment.id);
        			}
        			else{
        				dailyNum.increment("num");
        				res.send(comment.id);
        			}
        		});
        	});

		});
	});

	app.get("/comment-edit", GetCurUser, function(req, res){
		var user = req.userInfo;
		var commentID = req.query.comment;
		var content = req.query.content;
		if(!user) return res.send("please login");
		if(!commentID) return res.send("no commentID");

		mysqlDB.Comment.update({'comment': content},
			{where: {'id': commentID, 'userID': user.id}}).then(function() {
    	    res.send("ok");
    	});
	});

	app.get("/comment-delete", GetCurUser, function(req, res){
		var user = req.userInfo;
		var commentID = req.query.comment;
		if(!user) return res.send("please login");
		if(!commentID) return res.send("no commentID");

		mysqlDB.Comment.findOne({where: {'id': commentID, 'userID': user.id}}).then(function(comment){
			if(comment){
				//update comment daily num
				var t = new Date(comment.time);
				var date = t.getFullYear()+"/"+(t.getMonth()+1)+"/"+t.getDate();
				mysqlDB.CommentDailyNum.findOne({where: {userID: user.id, date: new Date(date)}}).then(function(dailyNum){
	    			if(dailyNum){
	    				if(dailyNum.num == 1){
	    					mysqlDB.CommentDailyNum.destroy({where: {id: dailyNum.id}});
	    				}
	    				else dailyNum.decrement("num");
	    			}
	    			mysqlDB.Comment.destroy({where: {'id': commentID, 'userID': user.id}}).then(function() {
			    	    res.send("ok");
			    	});
	    		});
			}
			else res.send("not found");
		});
	});

	app.get("/comment-daily", GetCurUser, function(req, res){
		var user = req.userInfo;
		var year = req.query.year;
		if(!user) return res.send("please login");
		if(!year) return res.send("no year");

		query = {};
		query.userID = user.id;
		query.date = {$gte: new Date(year+"/01/01 00:00"), $lte: new Date(year+"/12/31 23:59")};

		mysqlDB.CommentDailyNum.findAll({where: query, attributes: ["date", "num"]}).then(function(daily) {
    	    res.send(daily);
    	});
	});

	//===========================login related======================================
	function errFunc(err){
		console.log(err);
	}

	app.get('/login-by-google', function(req, res){
		var option = { scope : ['profile', 'email'], "prompt": "select_account" };
		passport.authenticate('google', option)(req, res, errFunc);	
	});

    app.get('/auth/google/callback', function(req, res){
    	passport.authenticate('google', {
				successRedirect : '/',
				failureRedirect : '/'
		})(req, res, errFunc);
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });


    //=================utility func==========================
	function DateToTimeString(date){
		var str = date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
		return str;
	}

	function DateToDateString(date){
		return date.getFullYear()+"/"+(date.getMonth()+1)+"/"+date.getDate();
	}

	function isLoggedIn(req, res, next) {
	    if (req.isAuthenticated()) return next();
	    res.redirect('/?message='+encodeURIComponent('請先登入'));
	};

	function GetCurUser(req, res, next){
		var info = req.session.passport.user;
		mysqlDB.User.findOne({where: {'id': info}}).then(function(user) {
			if(user){
				req.userInfo = user;
				next();			
			}
			else next();
		});
	};
}