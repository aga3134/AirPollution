var map;
var pm25Array = [];
var weatherArray = [];
var powerStationArray = [];
var roadArray = [];
var infoWindow = new google.maps.InfoWindow();
var pm25Window = new google.maps.InfoWindow();
var infoIndex = -1;

function ClearMap(){
	for(var key in pm25Array){
		pm25Array[key].setOptions({
    		map: null
    	});
	}
	for(var key in weatherArray){
		weatherArray[key].setOptions({
    		map: null
    	});
	}
	for(var key in powerStationArray){
		powerStationArray[key].setOptions({
    		map: null
    	});
	}
	for(var key in roadArray){
		roadArray[key].setOptions({
    		map: null
    	});
	}
	pm25Array = [];
	weatherArray = [];
	powerStationArray = [];
	roadArray = [];
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgb(r,g,b){
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function ValueToColor(v){
	if(v <= 11) return rgb(156, 255, 156);
	else if(v <= 23) return rgb(49, 255, 0);
	else if(v <= 35) return rgb(49, 207, 0);
	else if(v <= 41) return rgb(255, 255, 0);
	else if(v <= 47) return rgb(255, 207, 0);
	else if(v <= 53) return rgb(255, 154, 0);
	else if(v <= 58) return rgb(255, 100, 100);
	else if(v <= 64) return rgb(255, 0, 0);
	else if(v <= 70) return rgb(153, 0, 0);
	else return rgb(206, 48, 255);
}

function UpdateMapPM25(data){
	if(data.length == 0){
		$(".map-loading").css("display","block");
	}
	else{
		$(".map-loading").css("display","none");
	}

	function clickFn(d){ 
		return function() {
			var str = "<p>"+d.siteName+"測站</p><p>PM2.5數值: "+d.pm25+"</p><p>更新時間: "+d.time;
			var loc = new google.maps.LatLng(d.lat, d.lng);
			pm25Window.setOptions({content: str, position: loc});
			pm25Window.open(map);
		};
	}
	if(pm25Window.getMap()){
		pm25Window.setOptions({map: null});
	}

	var opacity = $("#opacity").val();
	var radius = $("#pm25Radius").val();	//單位公里
	for(var i=0;i<data.length;i++){
		var d = data[i];
		var loc = new google.maps.LatLng(d.lat, d.lng);

	    if(pm25Array[d.siteID] == null){
	    	var circle = new google.maps.Circle({
		      strokeColor: '#000000',
		      strokeOpacity: 0.0,
		      strokeWeight: 0,
		      fillColor: ValueToColor(d.pm25),
		      fillOpacity: opacity,
		      map: map,
		      center: loc,
		      radius: radius*1000,	//單位公尺
		      zIndex: 1
		    });
		    circle.listener = circle.addListener('click', clickFn(d));
	    	pm25Array[d.siteID] = circle;
	    }
	    else{
	    	var circle = pm25Array[d.siteID];
	    	google.maps.event.clearListeners(circle,'click');
	    	circle.addListener('click', clickFn(d));
	    	circle.setOptions({
	    		//center: loc,
	    		fillColor: ValueToColor(d.pm25)
	    	});
	    }
	}
}

function UpdateMapWeather(data){
	function GenArrow(loc, wDir, wSpeed, scale){
		var arrow = [];
		var theta = wDir*Math.PI/180;
		var mag = wSpeed*scale;
		//console.log(wDir);
		//console.log(-Math.cos(theta)+","+-Math.sin(theta));

		var a1 = (wDir+150)*Math.PI/180;
		var a2 = (wDir+270)*Math.PI/180;
		var as = 0.01;

		arrow[0] = loc;
		arrow[1] = {lat: loc.lat()-mag*Math.cos(theta), lng: loc.lng()-mag*Math.sin(theta)};
		arrow[2] = {lat: arrow[1].lat-as*Math.cos(a1), lng: arrow[1].lng-as*Math.sin(a1)};
		arrow[3] = {lat: arrow[2].lat-as*Math.cos(a2), lng: arrow[2].lng-as*Math.sin(a2)};
		arrow[4] = {lat: arrow[1].lat, lng: arrow[1].lng};
		return arrow;
	}
	//台灣的位置經緯度差1度約差111公里，風速1 m/s = 0.6km/10min
	//1 m/s風速每10分鐘可將空汙吹動0.0054度 => 箭頭長度約為此風速下30分鐘空汙移動距離
	var arrowScale = 0.0162;

	var showWind = $("#showWind").is(":checked");
	var showMap = showWind?map:null;
	for(var i=0;i<data.length;i++){
		var d = data[i];
		if(d.wSpeed < 0) continue;
		var loc = new google.maps.LatLng(d.lat, d.lng);

	    if(weatherArray[d.siteID] == null){
			var arrow = new google.maps.Polyline({
				path: GenArrow(loc, d.wDir, d.wSpeed, arrowScale),
				geodesic: true,
				strokeColor: '#0000FF',
				strokeWeight: 1,
				map: showMap,
				zIndex: 3
			});
	    	weatherArray[d.siteID] = arrow;
	    }
	    else{
	    	weatherArray[d.siteID].setOptions({
	    		path: GenArrow(loc, d.wDir, d.wSpeed, arrowScale),
	    	});
	    }
	}
}

function UpdateMapPowerGen(data, time){
	function clickFn(data, i, time){ 
		return function() {
			var d = data[i];
			var str = "<p>"+d.name+"發電廠</p><p>發電量 "+d.gen[time]+" MV</p>";
			var loc = new google.maps.LatLng(d.lat, d.lng);
			infoWindow.setOptions({content: str, position: loc});
			infoWindow.open(map);
			infoIndex = i;
		};
	}
	//info window有打開，更新資訊
	if(infoWindow.getMap()){
		var d = data[infoIndex];
		var str = "<p>"+d.name+"發電廠</p><p>發電量 "+d.gen[time]+" MV</p>";
		var loc = new google.maps.LatLng(d.lat, d.lng);
		infoWindow.setOptions({content: str, position: loc});
	}

	var showPowerStation = $("#showPowerStation").is(":checked");
	var showMap = showPowerStation?map:null;
	for(var i=0;i<data.length;i++){
		var d = data[i];
		if(!d.gen) continue;

		var loc = new google.maps.LatLng(d.lat, d.lng);
		//依電廠發電量(MW)改變方框大小
		var size = 0.01*d.gen[time]/1000;
		var coord = [
			{lat: loc.lat()-size, lng: loc.lng()-size},
			{lat: loc.lat()+size, lng: loc.lng()-size},
			{lat: loc.lat()+size, lng: loc.lng()+size},
			{lat: loc.lat()-size, lng: loc.lng()+size}
		];
		if(powerStationArray[d.name] == null){
			var rect = new google.maps.Polygon({
				paths: coord,
				strokeColor: '#000000',
				strokeWeight: 2,
				fillOpacity: 0,
				zIndex: 2,
				map: showMap
			});
			
			rect.addListener('click', clickFn(data,i,time));
			powerStationArray[d.name] = rect;
		}
		else{
			powerStationArray[d.name].addListener('click', clickFn(data,i,time));
			powerStationArray[d.name].setOptions({
	    		path: coord
	    	});
		}
		
	}
}

function UpdateMapTraffic(roadSegment, roadData){
	var showTraffic = $("#showTraffic").is(":checked");
	var showMap = showTraffic?map:null;

	var color = [];
	color.push(rgb(200,200,200));
	color.push(rgb(100,100,255));
	color.push(rgb(255,50,0));
	color.push(rgb(150,50,0));

	for(var i=0;i<roadData.length;i++){
		var d = roadData[i];
		var roadID = d.roadID;
		var road = roadSegment[roadID];
		if(!road) continue;
		if(roadArray[roadID] == null){
			var roadPath = new google.maps.Polyline({
				path: road.path,
				strokeColor: color[d.level-1],
				strokeOpacity: 1.0,
				strokeWeight: 2,
				map: showMap,
				zIndex: 4
			});
			
			roadArray[roadID] = roadPath;
		}
		else{
			roadArray[roadID].setOptions({
	    		strokeColor: color[d.level-1],
	    	});
		}
	}
}

function InitMap() {
	var taiwan = new google.maps.LatLng(23.682094,120.7764642);

	map = new google.maps.Map(document.getElementById('map'), {
	  center: taiwan,
	  zoom: 7,
	  scaleControl: true,
	  //mapTypeId: google.maps.MapTypeId.SATELLITE
	  //mapTypeId: google.maps.MapTypeId.TERRAIN
	});

	var northY = 24.5, southY = 23.5;
	var westX = 119.5, eastX = 122.5;
	var northSeg = [
		{lat: northY, lng: westX},
		{lat: northY, lng: eastX}];
	var northLine = new google.maps.Polyline({
		path: northSeg,
		geodesic: true,
		strokeColor: '#0000FF',
		strokeOpacity: 1.0,
		strokeWeight: 1
	});
	//northLine.setMap(map);
	
	var southSeg = [
		{lat: southY, lng: westX},
		{lat: southY, lng: eastX}];
	var southLine = new google.maps.Polyline({
		path: southSeg,
		geodesic: true,
		strokeColor: '#0000FF',
		strokeOpacity: 1.0,
		strokeWeight: 1
	});
	//southLine.setMap(map);

	$("#opacity").change(function(){
		var opacity = $("#opacity").val();
		for (var key in pm25Array) {
			pm25Array[key].setOptions({
	    		fillOpacity: opacity
	    	});
		}

	});

	$("#pm25Radius").change(function(){
		var radius = $("#pm25Radius").val();	//單位公里
		for (var key in pm25Array) {
			pm25Array[key].setOptions({
	    		radius: radius*1000	//單位公尺
	    	});
		}
		$("#radiusLabel").html(radius+"公里");
	});
}

function ToggleWind(){
	var showWind = $("#showWind").is(":checked");
	var showMap = showWind?map:null;
	for(var key in weatherArray) {
		weatherArray[key].setOptions({map: showMap});
	};
}

function TogglePowerStation(){
	var showPowerStation = $("#showPowerStation").is(":checked");
	var showMap = showPowerStation?map:null;
	for(var key in powerStationArray) {
		powerStationArray[key].setOptions({map: showMap});
	};
}

function ToggleTraffic(){
	var showTraffic = $("#showTraffic").is(":checked");
	var showMap = showTraffic?map:null;
	for(var key in roadArray) {
		roadArray[key].setOptions({map: showMap});
	};
}

google.maps.event.addDomListener(window, 'load', InitMap);