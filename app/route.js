
var PowerLoad = require('../db/powerLoad');
var PowerRatio = require('../db/powerRatio');
var PowerStation = require('../db/powerStation');
var Sensor10minSum = require('../db/sensor10minSum');
var SensorDailySum = require('../db/sensorDailySum');
var SensorSite = require('../db/sensorSite');
var WeatherStation = require('../db/weatherStation');

//一天的data存成一個collection，必免資料太大存取很慢
var mongoose = require('mongoose');
var PowerGenSchema = require('../db/powerGenSchema');
var SensorDataSchema = require('../db/sensorDataSchema');
var WeatherDataSchema = require('../db/weatherDataSchema');
var version = "1.0.1";

module.exports = function(app){
	app.get("/", function(req, res){
		res.render("static/index.html", {version: version});
	});
	
	app.get("/sensorSite", function(req, res){
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

	function DateToTimeString(date){
		var str = date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
		return str;
	}

	function DateToDateString(date){
		return date.getFullYear()+"/"+(date.getMonth()+1)+"/"+date.getDate();
	}
}