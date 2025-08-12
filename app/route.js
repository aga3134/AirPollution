
var PowerLoad = require('../db/powerLoad');
var PowerRatio = require('../db/powerRatio');
var PowerStation = require('../db/powerStation');
var SensorSite = require('../db/sensorSite');
var WeatherStation = require('../db/weatherStation');
var RoadSegment = require('../db/roadSegment');

var formidable = require('formidable');
var uuid = require('uuid/v4');
var mysqlDB = require("./mysqlDB");
var Config = require("../config.js");

//一天的data存成一個collection，必免資料太大存取很慢
var mongoose = require('mongoose');
var PowerGenSchema = require('../db/powerGenSchema');
//var SensorDataSchema = require('../db/sensorDataSchema');
var SensorGridSchema = require('../db/sensorGridSchema');
var WeatherDataSchema = require('../db/weatherDataSchema');
var RoadDataSchema = require('../db/roadDataSchema');
var Sensor10minSumSchema = require('../db/sensor10minSumSchema');
var SensorDailySumSchema = require('../db/sensorDailySumSchema');
var version = "1.2.0";
var numPerPage = 10;

module.exports = function(app, passport){
	mysqlDB.Init();

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

                //validate date
                var t = new Date(date+" 00:00");
                if(isNaN(t.getTime())) return; 

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

		var countryCode = "s";
		switch(req.query.country){
			case "Taiwan": countryCode = "s"; break;
			case "Korea": countryCode = "_krs"; break;
		}
		var SensorDailySum = mongoose.model('SensorDailySum'+countryCode, SensorDailySumSchema);
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

                //validate date
                var t = new Date(date+" 00:00");
                if(isNaN(t.getTime())) return;

		//get data within the day
		var conditions = [];
		conditions.push({'_id': {$gte: new Date(date+" 0:0:0")}});
		conditions.push({'_id': {$lte: new Date(date+" 23:59:59")}});
		var query   = {$and: conditions};

		var countryCode = "s";
		switch(req.query.country){
			case "Taiwan": countryCode = "s"; break;
			case "Korea": countryCode = "_krs"; break;
		}
		var Sensor10minSum = mongoose.model('Sensor10minSum'+countryCode, Sensor10minSumSchema);
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

		var countryCode = "s";
		switch(req.query.country){
			case "Taiwan": countryCode = "s"; break;
			case "Korea": countryCode = "_krs"; break;
		}
		var SensorDailySum = mongoose.model('SensorDailySum'+countryCode, SensorDailySumSchema);
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

                //validate date
                var t = new Date(date+" 00:00");
                if(isNaN(t.getTime())) return;

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

                //validate date
                var t = new Date(date+" 00:00");
                if(isNaN(t.getTime())) return;

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

                //validate date
                var t = new Date(date+" 00:00");
                if(isNaN(t.getTime())) return;

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

                //validate date
                var t = new Date(date+" 00:00");
                if(isNaN(t.getTime())) return;

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

                //validate date
                var t = new Date(date+" 00:00");
                if(isNaN(t.getTime())) return;

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
