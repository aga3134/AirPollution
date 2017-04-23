var fs = require('fs-extra');
var parseXML = require('xml2js').parseString;
var Config = require("./config.js");
var dataToDB = require("./app/dataToDB");
var mongoose = require("mongoose");
var schedule = require("node-schedule");
var os = require('os');

mongoose.connect("mongodb://localhost/AirPollution", {
  server: {
    socketOptions: {
      socketTimeoutMS: 0,
      connectTimeoutMS: 0
    }
  }
});
mongoose.Promise = global.Promise;

process.on('exit',function(){
	mongoose.disconnect();
});

function ProcessDirSync(dir, doneDir, extractDate, action){
	if (!fs.existsSync(dir)){
		return console.log(dir+" not exist");
	}
	if (!fs.existsSync(doneDir)){
		fs.mkdirsSync(doneDir);
	}

	var files = fs.readdirSync(dir);
	if(!files) return console.log("null files");
	for(var i=0;i<=12;i++){
		if(i >= files.length) return;
		var memUse = (1-os.freemem()/os.totalmem());
		console.log("memUse: "+Math.floor(memUse*100)+"%");
		if(memUse > 0.8) return console.log("memory usage > 80%. halt on.");
		
		var file = files[i];
		console.log("Processing "+file+"...");

		if(fs.lstatSync(dir+file).isDirectory()){
			console.log("skip directory: "+dir+file);
			continue;
		}
		var data = fs.readFileSync(dir+file, 'utf8');
		if(!data){
			console.log("No data");
			continue;
		}
		var seg = file.split("_");
		var fileDate = seg[1];
		var fileTime;
		if(seg[2]){
			var t = seg[2].split(".")[0];
			if(t){
				fileTime = t.replace("-",":")+":00";
			}
		}
		
		if(extractDate){
			action(data, fileDate, fileTime);
		}
		else action(data);

		fs.rename( dir+file, doneDir+file, function(err) {
            if(err) console.log(err);
        });
	}
}

schedule.scheduleJob('0 */5 * * * *', function(){
	//sensor data
	var dir = "./data/airdata/";
	var doneDir = "./data/done/airdata/";
	ProcessDirSync(dir, doneDir, true, function(data, date, time){
		var obj;
		try {
			obj = JSON.parse(data);
			dataToDB.SensorGridToDB(obj, date, time);
		} catch (e) {
			return console.error(e);
		}
	});

	//power data
	dir = "./data/genary/";
	doneDir = "./data/done/genary/";
	ProcessDirSync(dir, doneDir, false, function(data){
		var obj;
		try {
			var quote = data.indexOf("\"");
			data = "{\"time"+data.substr(quote+1,data.length);
			obj = JSON.parse(data);
			dataToDB.PowerGenToDB(obj);
		} catch (e) {
			return console.error(e);
		}
	});

	dir = "./data/loadareas/";
	doneDir = "./data/done/loadareas/";
	ProcessDirSync(dir, doneDir, true, function(data, date, time){
		try {
			dataToDB.PowerLoadToDB(data, date, time);
		} catch (e) {
			return console.error(e);
		}
	});

	dir = "./data/loadfueltype/";
	doneDir = "./data/done/loadfueltype/";
	ProcessDirSync(dir, doneDir, true, function(data, date, time){
		try {
			dataToDB.PowerRatioToDB(data, date, time);
		} catch (e) {
			return console.error(e);
		}
	});

	//weather data
	dir = "./data/weather/";
	doneDir = "./data/done/weather/";
	ProcessDirSync(dir, doneDir, false, function(data){
		try {
			parseXML(data, function (err, result) {
				if(err) return console.error(err);
				else dataToDB.WeatherDataToDB(result);
			});
		} catch (e) {
			return console.error(e);
		}
	});

	//road segment data
	dir = "./data/roadSegment/";
	doneDir = "./data/done/roadSegment/";
	ProcessDirSync(dir, doneDir, false, function(data){
		try {
			parseXML(data, function (err, result) {
				if(err) return console.error(err);
				else dataToDB.RoadSegmentToDB(result);
			});
		} catch (e) {
			return console.error(e);
		}
	});

	//road data
	dir = "./data/traffic/";
	doneDir = "./data/done/traffic/";
	ProcessDirSync(dir, doneDir, false, function(data){
		try {
			parseXML(data, function (err, result) {
				if(err) return console.error(err);
				else dataToDB.RoadDataToDB(result);
			});
		} catch (e) {
			return console.error(e);
		}
	});
});
