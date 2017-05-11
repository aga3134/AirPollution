var fs = require('fs-extra');
var parseXML = require('xml2js').parseString;
var PowerLoad = require('../db/powerLoad');
var PowerRatio = require('../db/powerRatio');
var PowerStation = require('../db/powerStation');
var Sensor10minSum = require('../db/sensor10minSum');
var SensorDailySum = require('../db/sensorDailySum');
var SensorSite = require('../db/sensorSite');
var WeatherStation = require('../db/weatherStation');
var RoadSegment = require('../db/roadSegment');
var Config = require("../config.js");
var os = require('os');

var moment = require("moment");
var zoneStr = "Asia/Taipei";

//一天的data存成一個collection，必免資料太大存取很慢
var mongoose = require('mongoose');
var PowerGenSchema = require('../db/powerGenSchema');
//var SensorDataSchema = require('../db/sensorDataSchema');
var SensorGridSchema = require('../db/sensorGridSchema');
var WeatherDataSchema = require('../db/weatherDataSchema');
var RoadDataSchema = require('../db/roadDataSchema');

var dataToDB = {};

dataToDB.LatToArea = function(lat){
	if(lat < 23.5) return "south";
	else if(lat > 24.5) return "north";
	else return "central";
}


dataToDB.SensorGridToDB = function(data, date, time){
	if(data.status != "ok") return;
	var gridArray = [];
	var gridPerUnit = Config.gridPerUnit;
	var levelNum = Config.levelNum;
	for(var i=0;i<levelNum;i++){
		gridArray[i] = [];
	}

	for(var i=0;i<data.devices.length;i++){
		var device = data.devices[i];
		if(device.pm25 <= 0 || device.pm25 >= 3000) continue;	//不正常的數值，跳過
		if(device.lat < 21 || device.lat > 26) continue;		//只保留台灣附近的範圍，其他視為雜訊
		if(device.lon < 118 || device.lon > 123) continue;
		if(device.time == ""){
			device.time = date+" "+time;
			//console.log("empty time. set time as "+device.time);
		}

		for(var j=0;j<levelNum;j++){	//計算對每個level貢獻
			var scale = gridPerUnit/Math.pow(2,j);
			var gridX = device.lon*scale;
			var gridY = device.lat*scale;
			var intX = Math.floor(gridX);
			var intY = Math.floor(gridY);

			var gridData = {};
			gridData.level = j;
			//每十分鐘記一筆資料
			var t = new Date(device.time);
			t.setSeconds(0);
			t.setMinutes(Math.floor(t.getMinutes()/10)*10);
			if ( isNaN( t.getTime() ) ) {
				console.log("invalid date: "+device.time);
				console.log("truncated date: "+t);
				continue;
			}
			gridData.time = t;
			//四捨五入到最近網格
			gridData.gridX = Math.floor(intX+0.5);
			gridData.gridY = Math.floor(intY+0.5);

			//計算貢獻比例，越遠越小
			var wX = 1-Math.abs(gridX-gridData.gridX);
			var wY = 1-Math.abs(gridY-gridData.gridY);
			var weight = wX*wY;
			gridData.pm25 = device.pm25*weight;
			gridData.t = device.t*weight;
			gridData.h = device.h*weight;
			gridData.weight = weight;

			var key = gridData.time.toString()+gridData.gridX.toString()+gridData.gridY.toString();
			var arr = gridArray[j];
			if(arr[key]){
				arr[key].pm25 += gridData.pm25;
				arr[key].t += gridData.t;
				arr[key].h += gridData.h;
				arr[key].weight += gridData.weight;
			}
			else arr[key] = gridData;
			
		}
	}
	//for(var j=0;j<levelNum;j++){
	//	console.log(Object.keys(gridArray[j]).length);
	//}

	//recursive add all grid data
	function AddGridDataRec(data, level, i){
		if(level >= levelNum) return;
		var arr = data[level];
		var keys = Object.keys(arr);
		if(i >= keys.length) return AddGridDataRec(data, level+1, 0);
		var key = keys[i];
		var d = arr[key];
		var tDay = new Date(d.time);
		var date = tDay.getFullYear()+"_"+(tDay.getMonth()+1)+"_"+tDay.getDate();
		var SensorGrid = mongoose.model('SensorGrid_'+date, SensorGridSchema);

		//沒這筆資料就新增，有的話就加上新的數值
		var incValue = {"pm25": d.pm25, "t": d.t, "h": d.h, "weight": d.weight};
		SensorGrid.findOneAndUpdate({ 'level': d.level, "gridX": d.gridX, "gridY": d.gridY, "time": d.time},
			{'$inc': incValue}, {upsert: true, new: true}, function(err, sum){
				if(level == 0){
					//更新data sum
					var area = dataToDB.LatToArea(d.gridY/gridPerUnit);
					//每日總結
					tDay.setSeconds(0);
					tDay.setMinutes(0);
					tDay.setHours(0);
					
					var incValue = {};
					incValue[area+"Sum"] = d.pm25;
					incValue[area+"Num"] = d.weight;
			        if ( isNaN( tDay.getTime() ) ) {
				        console.log("invalid date: "+d.time);
				        return AddGridDataRec(data, level, i+1);
			        }
					SensorDailySum.findOneAndUpdate({ '_id': tDay}, {'$inc': incValue}, 
						{upsert: true, new: true}, function(err, sum){
						if(err) console.log(err);
						
						//每10分鐘總結
						var t10min = new Date(d.time);
						t10min.setSeconds(0);
						t10min.setMinutes(Math.floor(t10min.getMinutes()/10)*10);	//round to 10min

						Sensor10minSum.findOneAndUpdate({ '_id': t10min}, {'$inc': incValue}, 
							{upsert: true, new: true}, function(err, sum){
							if(err) console.log(err);
							
							AddGridDataRec(data, level, i+1);
						});
					});
				}
				else AddGridDataRec(data, level, i+1);
		});
	}
	
	AddGridDataRec(gridArray, 0, 0);
}
/*
dataToDB.SensorDataToDB = function(data, date, time){
	if(data.status != "ok") return;
	var siteArray = [];
	var dataArray = [];
	for(var i=0;i<data.devices.length;i++){
		var device = data.devices[i];
		if(device.time == ""){
			device.time = date+" "+time;
		}
		var site = {};
		site._id = device.id;
		site.name = device.name;
		site.type = device.type;
		site.lat = device.lat;
		site.lng = device.lon;
		siteArray.push(site);

		var siteData = {};
		siteData._id = device.id+device.time;
		siteData.siteID = device.id;
		siteData.pm25 = device.pm25;
		siteData.t = device.t;
		siteData.h = device.h;
		siteData.lat = device.lat;
		siteData.lng = device.lon;
		siteData.time = device.time;
		dataArray.push(siteData);
	}

	//recursive add all site data
	function AddSiteDataRec(arr, i){
		if(i >= arr.length) return;
		var d = arr[i];
		var tDay = new Date(d.time);
		var date = tDay.getFullYear()+"_"+(tDay.getMonth()+1)+"_"+tDay.getDate();
		var SensorData = mongoose.model('SensorData_'+date, SensorDataSchema);

		//沒這筆資料才加入
		SensorData.findOne({'_id': d._id}, function(err, found){
			if(err) console.log(err);
			if(found) return AddSiteDataRec(arr, i+1);
			SensorData.create(d, function(){
				//更新data sum
				var area = dataToDB.LatToArea(d.lat);

				//每日總結
				tDay.setSeconds(0);
				tDay.setMinutes(0);
				tDay.setHours(0);
				
				var incValue = {};
				incValue[area+"Sum"] = d.pm25;
				incValue[area+"Num"] = 1;
				SensorDailySum.findOneAndUpdate({ '_id': tDay}, {'$inc': incValue}, 
					{upsert: true, new: true}, function(err, sum){
					if(err) console.log(err);
					
					//每10分鐘總結
					var t10min = new Date(d.time);
					t10min.setSeconds(0);
					t10min.setMinutes(Math.floor(t10min.getMinutes()/10)*10);	//round to 10min

					Sensor10minSum.findOneAndUpdate({ '_id': t10min}, {'$inc': incValue}, 
						{upsert: true, new: true}, function(err, sum){
						if(err) console.log(err);
						
						AddSiteDataRec(arr, i+1);
					});
				});
				
			});
		});
	}

	//recursive add all sites
	function AddSiteRec(arr, i){
		if(i >= arr.length) return AddSiteDataRec(dataArray,0);	//add site data after all site added
		var site = arr[i];
		SensorSite.findOneAndUpdate({ '_id': site._id}, {'$set': { 'lat': site.lat, 'lng': site.lng }, '$setOnInsert': site}, {upsert: true}, function(){
			AddSiteRec(arr, i+1);
		});
	}

	AddSiteRec(siteArray, 0);
};*/

dataToDB.PowerGenToDB = function(data){
	var time = data.time;

	var stationArray = [];
	var dataArray = [];
	for(var i=0;i<data.aaData.length;i++){
		var device = data.aaData[i];
		if(device[1] == "小計") continue;
		var station = {};
		station.type = device[0].split("'")[1];
		station.name = device[1];
		station._id = station.type+station.name;
		station.capacity = device[2];
		stationArray.push(station);

		var stationData = {};
		stationData._id = station._id+time;
		stationData.stationID = station._id;
		stationData.powerGen = device[3];
		stationData.remark = device[5];
		stationData.time = time;
		dataArray.push(stationData);
	}

	//recursive add all station data
	function AddStationDataRec(arr, i){
		if(i >= arr.length) return;
		var d = arr[i];

		var tDay = new Date(d.time);
		var date = tDay.getFullYear()+"_"+(tDay.getMonth()+1)+"_"+tDay.getDate();
		var PowerGen = mongoose.model('PowerGen_'+date, PowerGenSchema);
		PowerGen.findOneAndUpdate({ '_id': d._id}, {'$setOnInsert': d}, {upsert: true}, function(){
			AddStationDataRec(arr, i+1);
		});
	}

	//recursive add all station
	function AddStationRec(arr, i){
		if(i >= arr.length) return AddStationDataRec(dataArray,0);
		var station = arr[i];
		PowerStation.findOneAndUpdate({ '_id': station._id}, {'$setOnInsert': station}, {upsert: true}, function(){
			AddStationRec(arr, i+1);
		});
	}

	AddStationRec(stationArray, 0);
}

dataToDB.PowerLoadToDB = function(data, date, time){
	//loadareas資料在凌晨12點取時會得到前一天的完整資料，把日期調回前一天
	if(time == "00:00:00"){
		var yestoday = moment(date).add(-1,"days");
		date = yestoday.format("YYYY-MM-DD");
	}

	var loadArr = data.split("\n");

	function AddLoadDataRec(arr, i){
		if(i >= arr.length) return;
		var loadData = arr[i].split(",");
		var pl = {};
		if(loadData[0].indexOf(":") == -1){
			loadData[0] += ":00";
		}
		pl._id = date+" "+loadData[0];
		pl.east = loadData[1];
		pl.south = loadData[2];
		pl.central = loadData[3];
		pl.north = loadData[4];
		PowerLoad.findOneAndUpdate({ '_id': pl._id}, {'$setOnInsert': pl}, {upsert: true}, function(){
			AddLoadDataRec(arr, i+1);
		});
	}
	AddLoadDataRec(loadArr, 0);
}

dataToDB.PowerRatioToDB = function(data, date, time){
	//loadfueltype資料在凌晨12點取時會得到前一天的完整資料，把日期調回前一天
	if(time == "00:00:00"){
		var yestoday = moment(date).add(-1,"days");
		date = yestoday.format("YYYY-MM-DD");
	}
	
	var ratioArr = data.split("\n");

	function AddLoadRatioRec(arr, i){
		if(i >= arr.length) return;
		var ratioData = arr[i].split(",");
		var pr = {};

		pr._id = date+" "+ratioData[0];
		pr.nuclear = ratioData[1];	//核能
		pr.coal = ratioData[2];		//燃煤
		pr.coGen = ratioData[3];	//氣電共生
		pr.ippCoal = ratioData[4];	//民營-燃煤
		pr.lng = ratioData[5];		//燃氣
		pr.ippLng = ratioData[6];	//民營-燃氣
		pr.oil = ratioData[7];		//重油
		pr.diesel = ratioData[8];	//輕油
		pr.hydro = ratioData[9];	//水力
		pr.wind = ratioData[10];	//風力
		pr.solar = ratioData[11];	//太陽能
		pr.pumpGen = ratioData[12];	//抽蓄發電
		pr.pumgLoad = ratioData[13];//抽蓄負載

		PowerRatio.findOneAndUpdate({ '_id': pr._id}, {'$setOnInsert': pr}, {upsert: true}, function(){
			AddLoadRatioRec(arr, i+1);
		});
	}
	AddLoadRatioRec(ratioArr, 0);
}

dataToDB.WeatherDataToDB = function(data){
	//console.log(Object.keys(data.cwbopendata.location[0]));
	//console.log(data.cwbopendata.location[0].weatherElement[0].elementValue[0]);
	var siteArray = [];
	var dataArray = [];
	if(!data.cwbopendata.location) return;
	for(var i=0;i<data.cwbopendata.location.length;i++){
		var device = data.cwbopendata.location[i];
		var site = {};
		site._id = device.stationId[0];
		site.name = device.locationName[0];
		site.lat = device.lat[0];
		site.lng = device.lon[0];
		for(var j=0;j<device.parameter.length;j++){
			var p = device.parameter[j];
			switch(p.parameterName[0]){
				case "CITY": site.city = p.parameterValue[0]; break;
				case "TOWN": site.town = p.parameterValue[0]; break;
			}
		}
		siteArray.push(site);

		var siteData = {};
		siteData._id = device.stationId[0]+device.time[0].obsTime[0];
		siteData.time = device.time[0].obsTime[0];
		siteData.siteID = device.stationId[0];
		for(var j=0;j<device.weatherElement.length;j++){
			var e = device.weatherElement[j];
			switch(e.elementName[0]){
				case "ELEV": siteData.height = e.elementValue[0].value[0]; break;
				case "WDIR": siteData.wDir = e.elementValue[0].value[0]; break;
				case "WDSD": siteData.wSpeed = e.elementValue[0].value[0]; break;
				case "TEMP": siteData.t = e.elementValue[0].value[0]; break;
				case "HUMD": siteData.h = e.elementValue[0].value[0]; break;
				case "PRES": siteData.p = e.elementValue[0].value[0]; break;
				case "SUN": siteData.sun = e.elementValue[0].value[0]; break;
				case "H_24R": siteData.rain = e.elementValue[0].value[0]; break;
			}
		}
		dataArray.push(siteData);
	}

	//recursive add all site data
	function AddSiteDataRec(arr, i){
		if(i >= arr.length) return;
		var d = arr[i];
		var tDay = new Date(d.time);
		var date = tDay.getFullYear()+"_"+(tDay.getMonth()+1)+"_"+tDay.getDate();
		var WeatherData = mongoose.model('WeatherData_'+date, WeatherDataSchema);

		WeatherData.findOneAndUpdate({ '_id': d._id}, {'$setOnInsert': d}, {upsert: true}, function(){
			AddSiteDataRec(arr, i+1);
		});
	}

	//recursive add all sites
	function AddSiteRec(arr, i){
		if(i >= arr.length) return AddSiteDataRec(dataArray,0);	//add site data after all site added
		var site = arr[i];
		WeatherStation.findOneAndUpdate({ '_id': site._id}, {'$setOnInsert': site}, {upsert: true}, function(){
			AddSiteRec(arr, i+1);
		});
	}

	AddSiteRec(siteArray, 0);
}

dataToDB.RoadSegmentToDB = function(data){
	var roadArray = [];
	var placeArr = data.kml.Document[0].Folder[0].Placemark;
	if(!placeArr) return;

	for(var i=0;i<placeArr.length;i++){
		var road = {};
		road._id = placeArr[i].Snippet[0];
		road.path = "";
		var coordArr = placeArr[i].LineString[0].coordinates[0].split(/\s+/);

		for(var j=0;j<coordArr.length;j++){
			var coord = coordArr[j].split(",");
			road.path += coord[0]+","+coord[1];
			if(j < coordArr.length-1) road.path += " ";
		}
		roadArray.push(road);
	}

	//recursive add all roads
	function AddRoadRec(arr, i){
		if(i >= arr.length) return;
		var road = arr[i];
		RoadSegment.findOneAndUpdate({ '_id': road._id}, {'$setOnInsert': road}, {upsert: true}, function(){
			AddRoadRec(arr, i+1);
		});
	}

	AddRoadRec(roadArray, 0);
}

dataToDB.RoadDataToDB = function(data){
	var roadDataArray = [];
	var infoArr = data.XML_Head.Infos[0].Info;
	if(!infoArr) return;
	for(var i=0;i<infoArr.length;i++){
		var info = infoArr[i].$;
		var d = {};
		d._id = info.routeid+info.datacollecttime;
		d.roadID = info.routeid;
		d.level = info.level;
		d.speed = info.value;
		d.travelTime = info.traveltime;
		d.time = info.datacollecttime;

		roadDataArray.push(d);
	}
	//recursive add all road data
	function AddRoadDataRec(arr, i){
		if(i >= arr.length) return;
		var d = arr[i];
		var tDay = new Date(d.time);
		var date = tDay.getFullYear()+"_"+(tDay.getMonth()+1)+"_"+tDay.getDate();
		var RoadData = mongoose.model('RoadData_'+date, RoadDataSchema);

		RoadData.findOneAndUpdate({ '_id': d._id}, {'$setOnInsert': d}, {upsert: true}, function(){
			AddRoadDataRec(arr, i+1);
		});
	}

	AddRoadDataRec(roadDataArray, 0);
}

dataToDB.DataFolderToDB = function(){
	var srcFolder = Config.dataSrcFolder;
	var dstFolder = Config.dataDoneFolder;
	function ProcessDir(dir, doneDir, extractDate, action){
		if (!fs.existsSync(dir)){
			return console.log(dir+" not exist");
		}
		if (!fs.existsSync(doneDir)){
			fs.mkdirsSync(doneDir);
		}

		fs.readdir( dir, function( err, files ) {
			if(err) return console.log(err);
			if(!files) return console.log("null files");
			var firstDate, firstHour;
			if(files.length > 0){
				var seg = files[0].split("_");
				firstDate = seg[1];
				if(seg[2]){
					firstHour = (seg[2].split(".")[0]).split("-")[0]; 
				}
			}

			function Process(arr, i){
				if(i >= arr.length) return;
				var file = files[i];

				if(fs.lstatSync(dir+file).isDirectory()){
					console.log("skip directory: "+dir+file);
					return Process(arr, i+1);
				}

				fs.readFile(dir+file, 'utf8', function (err, data) {
					if (err){
						console.log(err);
						return Process(arr, i+1);
					}
					if(!data){
						console.log("No data");
						fs.rename( dir+file, doneDir+file, function(err) {
		                    if(err) console.log(err);
		                });
						return Process(arr, i+1);
					}

					var seg = file.split("_");
					var fileDate = seg[1];
					var fileTime, fileHour;
					if(seg[2]){
						var t = seg[2].split(".")[0];
						if(t){
							fileHour = t.split("-")[0];
							fileTime = t.replace("-",":")+":00";
						}
					}
					//if(!(fileDate == firstDate && fileHour == firstHour)) return;	//一次只處理一小時的資料，避免out of memory
					if(i>=12) return;	//限制最多一次處理檔案個數，避免out of memory
					console.log("Processing "+file+"...");
					var memUse = (1-os.freemem()/os.totalmem());
					console.log("memUse: "+Math.floor(memUse*100)+"%");
					if(memUse > 0.95) return console.log("memory usage > 95%. halt on.");

					if(extractDate){
						action(data, fileDate, fileTime);
					}
					else action(data);

					fs.rename( dir+file, doneDir+file, function(err) {
	                    if(err) console.log(err);
	                });
	                Process(arr, i+1);
				});
			}
			Process(files,0);
				
		});
	}
	//sensor data
	var dir = srcFolder+"airdata/";
	var doneDir = dstFolder+"airdata/";
	ProcessDir(dir, doneDir, true, function(data, date, time){
		var obj;
		try {
			obj = JSON.parse(data);
			dataToDB.SensorGridToDB(obj, date, time);
		} catch (e) {
			return console.error(e);
		}
	});

	//power data
	dir = srcFolder+"genary/";
	doneDir = dstFolder+"genary/";
	ProcessDir(dir, doneDir, false, function(data){
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

	dir = srcFolder+"loadareas/";
	doneDir = dstFolder+"loadareas/";
	ProcessDir(dir, doneDir, true, function(data, date, time){
		try {
			dataToDB.PowerLoadToDB(data, date, time);
		} catch (e) {
			return console.error(e);
		}
	});

	dir = srcFolder+"loadfueltype/";
	doneDir = dstFolder+"loadfueltype/";
	ProcessDir(dir, doneDir, true, function(data, date, time){
		try {
			dataToDB.PowerRatioToDB(data, date, time);
		} catch (e) {
			return console.error(e);
		}
	});

	//weather data
	dir = srcFolder+"weather/";
	doneDir = dstFolder+"weather/";
	ProcessDir(dir, doneDir, false, function(data){
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
	dir = srcFolder+"roadSegment/";
	doneDir = dstFolder+"roadSegment/";
	ProcessDir(dir, doneDir, false, function(data){
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
	dir = srcFolder+"traffic/";
	doneDir = dstFolder+"traffic/";
	ProcessDir(dir, doneDir, false, function(data){
		try {
			parseXML(data, function (err, result) {
				if(err) return console.error(err);
				else dataToDB.RoadDataToDB(result);
			});
		} catch (e) {
			return console.error(e);
		}
	});
}


module.exports = dataToDB;
