var map;
var timerID;
var curYear, curDate, curTime;
var maxDate, minDate;
var timeInterval = 10;

var mapSensorData;
var siteData;
var mapWeatherData;
var weatherSite;

function ShowDate(date){
  var hoverBlock = $("#hoverBlock");
  if(!date){
  	date = curDate;
  }
  var str = "日期: "+date;
  $("#showDay").text(str);
}

function ChangeTime(time){
	//$("#showTime").children(".time-bt").removeClass("select");
	//$("#showTime").children(".time-bt[data-time='"+time+"']").addClass("select");
	var selected = $("#showTime").children(".time-bt[data-time='"+time+"']");
	$("#selectTime").css("top",selected.css("top"));
	$("#selectTime").css("left",selected.css("left"));
	var scrollX = parseInt(selected.css("left")) - $("body").width()*0.5;
	var speed = 1000 / $("#playSpeed").val();
	if(timerID == null) speed = 500;
	$("#showTime").parent(".h-scroll").animate({scrollLeft: scrollX}, speed);

	curTime = time;
	$("#timeLabel").text(time);
	UpdateMapPM25(mapSensorData[time]);
	var hour = time.split(":")[0];
	UpdateMapWeather(mapWeatherData[hour]);
	SetPowerGraphTime(time);
	ChangeImageByTime(time);
}

function ChangeDate(date){
	//$("#dayContainer").children(".day-bt").removeClass("select");
	//$("#dayContainer").children(".day-bt[data-date='"+date+"']").addClass("select");
	curDate = date;
	var selected = $("#dayContainer").children(".day-bt[data-date='"+date+"']");
	$("#selectBlock").css("top",selected.css("top"));
	$("#selectBlock").css("left",selected.css("left"));
	var scrollX = parseInt(selected.css("left")) - $("body").width()*0.5;
	$("#dayContainer").parent(".h-scroll").animate({scrollLeft: scrollX}, 1000);
	
	ShowDate();
	var d = curYear+"/"+curDate;
	SetDateLabel(curYear+"/"+curDate);
	SetupImageSrc(d);
	LoadPowerGraph(d);

	$.get("/sensor10minSum?date="+curYear+"/"+date, function(data){
		var json = JSON.parse(data);
	    var sensorAvg = [];
	    for(var i=0;i<json.length;i++){
	      var avg = json[i];
	      var d = {};
	      d.northAvg = avg.northSum/avg.northNum;
	      d.centralAvg = avg.centralSum/avg.centralNum;
	      d.southAvg = avg.southSum/avg.southNum;
	      var dateArr = avg._id.split(":");
	      sensorAvg[dateArr[0]+":"+dateArr[1]] = d;
	    }
	    AddTimebar(sensorAvg);
	});

	var numPerHour = 60/timeInterval;
	mapSensorData = [];
	//pm2.5資料，每10分鐘1筆
	for(var i=0;i<24*numPerHour;i++){
		var h = Math.floor(i/numPerHour);
		var m = 10*(i%numPerHour);
		mapSensorData[h+":"+m] = [];	
	}
	//分24次load每小時data
	function LoadSensorData(hour){
		if(hour < 0 || hour >=24) return;
		var url = "/sensorData?date="+curYear+"/"+date+"&hour="+hour;
		$.get(url, function(data){
			var json = JSON.parse(data);
			for(var i=0;i<json.length;i++){
				var d = json[i];
				var t = d.time.split(":");
				var h = t[0];
				var m = Math.floor(t[1]/10)*10;
				var site = siteData[d.siteID];
				var sensorData = {};
				sensorData.siteID = d.siteID;
				sensorData.lat = site.lat;
				sensorData.lng = site.lng;
				sensorData.pm25 = d.pm25;
				mapSensorData[h+":"+m].push(sensorData);
			}
			if(hour == 0) ChangeTime("0:0");
			else if(curTime != "0:0") ChangeTime(curTime);
			LoadSensorData(hour+1);
		});
	}
	LoadSensorData(0);

	//load當日sensor data
	/*var url = "/sensorData?date="+curYear+"/"+date;
	$.get(url, function(data){
		var json = JSON.parse(data);
		for(var i=0;i<json.length;i++){
			var d = json[i];
			var t = d.time.split(":");
			var h = t[0];
			var m = Math.floor(t[1]/10)*10;
			var site = siteData[d.siteID];
			var sensorData = {};
			sensorData.siteID = d.siteID;
			sensorData.lat = site.lat;
			sensorData.lng = site.lng;
			sensorData.pm25 = d.pm25;
			mapSensorData[h+":"+m].push(sensorData);
		}
		ChangeTime("0:0");
	});*/

	//風向資料，每小時1筆
	mapWeatherData = [];
	for(var i=0;i<24;i++){
		mapWeatherData[i] = [];
	}
	var url = "/weatherData?date="+curYear+"/"+date;
	$.get(url, function(data){
		var json = JSON.parse(data);
		for(var i=0;i<json.length;i++){
			var d = json[i];
			var t = d.time.split(":");
			var h = t[0];
			
			var site = weatherSite[d.siteID];
			var wd = {};
			wd.siteID = d.siteID;
			wd.lat = site.lat;
			wd.lng = site.lng;
			wd.name = site.name;
			wd.wDir = d.wDir;
			wd.wSpeed = d.wSpeed;
			mapWeatherData[h].push(wd);
		}
		UpdateMapWeather(mapWeatherData[0]);
	});
}

function ChangeYear(){
	var showYear = $("#showYear");
	var year = showYear.val();
	var d = new Date(year+"/"+curDate);
	var minD = new Date(minDate);
	var maxD = new Date(maxDate);
	if(d < minD) d = minD;
	if(d > maxD) d = maxD;
	curDate = (d.getMonth()+1)+"/"+d.getDate();
	showYear.val(d.getFullYear());
	curYear = d.getFullYear();
	LoadDayGraph(ChangeDate);
}

function AddTime(t){	//in minutes
	if(!curTime) return;
	var arr = curTime.split(":");
	var hour = parseInt(arr[0]);
	var min = parseInt(arr[1]);
	min = min+t;
	if(min >= 60){
		min -= 60;
		hour += 1;
		if(hour >= 24){
			hour = 23;
			min = 50;
			Pause();
		}
	}
	else if(min < 0){
		min += 60;
		hour -= 1;
		if(hour < 0){
			hour = 0;
			min = 0;
		}
	}
	ChangeTime(hour+":"+min);
}

function Next(){
	AddTime(timeInterval);
}

function Prev(){
	AddTime(-timeInterval);
}

function Play(){
	$("#playBt").addClass("hide");
	$("#pauseBt").removeClass("hide");
	var speed = 1000 / $("#playSpeed").val();
	if(timerID == null){
		timerID = setInterval(Next, speed);
	}
}

function Pause(){
	$("#playBt").removeClass("hide");
	$("#pauseBt").addClass("hide");
	if(timerID){
		clearInterval(timerID);
		timerID = null;
	}
}

function AddTimebar(sensorData){
	var btW = 8, btH = 20;
	var showTime = $("#showTime");
	showTime.html("");
	var numPerHour = 60/timeInterval;

	var w = Math.min($("body").width(), showTime.width());
	var offsetX = (w-24*numPerHour*btW)*0.5;
	if(offsetX < 0) offsetX = 0;
	var offsetY = 0;
	
	//add button
	for(var i=0;i<24*numPerHour;i++){
		var h = Math.floor(i/numPerHour);
		var m = 10*(i%numPerHour);
		var html = $("<div></div>");
		html.attr("class","time-bt");
		html.attr("data-time",h+":"+m);
		html.css("left",i*btW+offsetX);
		html.css("top",offsetY);
		if(m == 0) html.css("border-left","1px solid white");
		var avg = sensorData[h+":"+m];
		if(avg){
	      html.css("background","linear-gradient("+color(avg.northAvg)+","+color(avg.centralAvg)+","+color(avg.southAvg)+")");
	      html.attr("onclick","ChangeTime('"+h+":"+m+"');");
	    }
	    else html.css("background","#555");
		showTime.append(html);
	}
	//add select block
	var selectTime = $("<div></div>");
	selectTime.attr("class","time-bt select");
	selectTime.attr("id","selectTime");
	selectTime.css("left",offsetX);
	selectTime.css("top",offsetY);
	selectTime.css("background-color","transparent");
	showTime.append(selectTime);

	//add time label
	for(var i=0;i<24;i++){
		var html = $("<div>"+i+":00</div>");
		html.attr("class","time-label");
		html.css("left",i*numPerHour*btW+offsetX);
		html.css("top",offsetY+btH);
		showTime.append(html);
	}
}

function Padding(str, pad){
	return pad.substring(0, pad.length - str.length) + str;
}

function SetDateLabel(date){
	var arr = date.split("/");
	arr[1] = Padding(arr[1],"00");
	arr[2] = Padding(arr[2],"00");	
	$("#dateLabel").val(arr[0]+"-"+arr[1]+"-"+arr[2]);
}

window.addEventListener('load', function() {
	var showYear = $("#showYear");

	$.get("/sensorSite", function(data){
		var json = JSON.parse(data);
		siteData = [];
		for(var i=0;i<json.length;i++){
			siteData[json[i]._id] = json[i];
		}
	});

	$.get("/extremeDate", function(data){
		var json = JSON.parse(data);
		maxDate = json.maxDate.replace(/\//g,"-");
		minDate = json.minDate.replace(/\//g,"-");

		var minArr = minDate.split("-");
		var maxArr = maxDate.split("-");
		
		showYear.attr("min",minArr[0]);
		showYear.attr("max",maxArr[0]);

		curYear = maxArr[0];
		curDate = maxArr[1]+"/"+maxArr[2];

		$("#dateLabel").attr("min",minDate);
		$("#dateLabel").attr("max",maxDate);
		SetDateLabel(curYear+"/"+curDate);

		showYear.val(curYear);
		ChangeYear();
		showYear.change(ChangeYear);
	});

	$.get("/weatherStation", function(data){
		var json = JSON.parse(data);
		weatherSite = [];
		for(var i=0;i<json.length;i++){
			weatherSite[json[i]._id] = json[i];
		}
	});

	$("#dateLabel").change(function(){
		var d = $("#dateLabel").val();
		var arr = d.split("-");
		ChangeDate(arr[1]+"/"+arr[2]);	//只取月日
	});

	$("#playSpeed").change(function(){
		if(timerID != null){
			Pause();
			Play();
		}
	});
});