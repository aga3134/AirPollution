var map;
//var pm25Array = [];
var weatherArray = [];
var powerStationArray = [];
var roadArray = [];
var infoWindow = new google.maps.InfoWindow();
var pm25Window = new google.maps.InfoWindow();
var roadWindow = new google.maps.InfoWindow();
var infoIndex = -1;
var showRelative = false;
var addMarker = false;
var markerWindow = new google.maps.InfoWindow();
var showComment = false;
var commentArray = [];
var commentForm = "";

var pm25Grid = [];
var levelNum = 6;
var curLevel = 4;

function ClearMap(){
	/*for(var key in pm25Array){
		pm25Array[key].setOptions({
    		map: null
    	});
	}*/
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
	for(var key in commentArray){
		commentArray[key].setOptions({
    		map: null
    	});
	}
	//pm25Array = [];
	weatherArray = [];
	powerStationArray = [];
	roadArray = [];
	commentArray = [];

	for(var i=0;i<levelNum;i++){
		var grid = pm25Grid[i];
		for(key in grid){
			var data = grid[key];
			for(coord in data){
				if(!data[coord].rect) continue;
				data[coord].rect.setOptions({
		    		map: null
		    	});
			}
		}
		pm25Grid[i] = [];
	}
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgb(r,g,b){
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function ValueToColor(v){
	var colorIndex = $("#colorIndex").val();
	var color;
	switch(colorIndex){
		case "PM25":
			color = d3.scale.linear().domain([0,11,23,35,41,47,53,58,64,70, 1000])
				.range([rgb(156,255,156), rgb(49, 255, 0), rgb(49, 207, 0), rgb(255, 255, 0), rgb(255, 207, 0), 
				rgb(255, 154, 0), rgb(255, 100, 100), rgb(255, 0, 0), rgb(153, 0, 0), rgb(206, 48, 255), rgb(0,0,0)]);
			break;
		case "NASA_PM25":
			color = d3.scale.linear().domain([0,3,5,8,10,13,15,18,20,35,50,65,80,90,100])
				.range([rgb(0,0,250), rgb(0, 39, 253), rgb(0, 128, 254), rgb(0, 189, 243), rgb(1, 254, 236), 
				rgb(94, 255, 146), rgb(134, 253, 125), rgb(226, 254, 30), rgb(251, 255, 0), rgb(254, 148, 0),
				rgb(252,25,0), rgb(186,0,0),rgb(186,0,152),rgb(220,15,215),rgb(255,0,255)]);
			break;
		case "AQI":
			color = d3.scale.linear().domain([0,15,35,54,150,250,350,500])
				.range(["#00e800","#00e800", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", 
				"#7e0023", "#7e0023"]);
			break;
	}
	
	if(!v) return "#ffffff";
	else return color(v);
	/*if(v <= 11) return rgb(156, 255, 156);
	else if(v <= 23) return rgb(49, 255, 0);
	else if(v <= 35) return rgb(49, 207, 0);
	else if(v <= 41) return rgb(255, 255, 0);
	else if(v <= 47) return rgb(255, 207, 0);
	else if(v <= 53) return rgb(255, 154, 0);
	else if(v <= 58) return rgb(255, 100, 100);
	else if(v <= 64) return rgb(255, 0, 0);
	else if(v <= 70) return rgb(153, 0, 0);
	else return rgb(206, 48, 255);*/
}

function GetLevel(){
	var zoom = map.getZoom();
	var level = 11-zoom;
	if(level > 5) level = 5;
	if(level < 0) level = 0;
	return level;
}

function UpdateGridZoom(){
	var level = GetLevel();
	for(var i=0;i<levelNum;i++){
		var showMap = i==level?map:null;
		var grid = pm25Grid[i];
		for(key in grid){
			var data = grid[key];
			for(coord in data){
				if(!data[coord].rect) continue;
				data[coord].rect.setOptions({
		    		map: showMap
		    	});
			}
		}
	}
	curLevel = level;
}

function UpdateMapSensorGrid(){
	//grid structure: level -> tile -> time -> data
	//zoom: 6->12x6->L5, 7->6x3->L4, 8->3x1.5->L3, 9->1.5x0.75->L2, 10->0.75x0.375->L1, 11->0.375x0.1875->L0
	//tile size: L0->0.1, L1->0.2, L2->0.4, L3->0.8, L4->1.6, L5->3.2

	function clickFn(d){ 
		return function() {
			var str = "<p>座標: ("+d.lat.toFixed(2)+","+d.lng.toFixed(2)+")</p>";
			str += "<p>更新時間: "+d.time+"</p>";
			str += "<p>PM2.5平均值: "+(d.pm25?d.pm25:"無資料")+"</p>";
			var loc = new google.maps.LatLng(d.lat, d.lng);
			pm25Window.setOptions({content: str, position: loc});
			pm25Window.open(map);
		};
	}
	if(pm25Window.getMap()){
		pm25Window.setOptions({map: null});
	}

	var bound = map.getBounds();
	if(!bound) return;
	var minLat = bound.getSouthWest().lat();
	var minLng = bound.getSouthWest().lng();
	var maxLat = bound.getNorthEast().lat();
	var maxLng = bound.getNorthEast().lng(); 

	var level = GetLevel();
	var step = 0.1*Math.pow(2,level);
	minLat = Math.floor(minLat/step)*step;
	minLng = Math.floor(minLng/step)*step;
	maxLat = Math.ceil(maxLat/step)*step;
	maxLng = Math.ceil(maxLng/step)*step;
	var grid = pm25Grid[level];

	var opacity = $("#opacity").val();
	var radius = $("#pm25Radius").val();	//單位公里

	var strokeWeight = showRelative?1:0;
	var sensitive = $("#sensitive").val();
	var relativeColor = d3.scale.linear().domain([0,30-sensitive]).range(["#00ff00", "#ff0000"]);
	var fillColor;

	//update or load data of grids within bounds
	function UpdateGrid(level, lat, lng){
		var grid = pm25Grid[level];
		//truncate到小數後2位，避免誤差造成key不同
		var key = lat.toFixed(2)+","+lng.toFixed(2);
		if(grid[key]){	//update grid data in map
			for (var coord in grid[key]) {
				var curGrid = grid[key][coord];
				var cLat = curGrid.loc.lat();
			    var cLng = curGrid.loc.lng();
				var d = curGrid.pm25[curTime];
				var preD = curGrid.pm25[preTime];
				if(!curGrid.rect) continue;
				if(showRelative){
		    		if(preD) fillColor = relativeColor(d-preD);
		    		else fillColor = relativeColor(0);
		    	}
		    	else{
		    		fillColor = ValueToColor(d);
		    	}
		    	if(d){	//有新資料才更新，不然維持舊的
			    	google.maps.event.clearListeners(curGrid.rect,'click');
			    	var op = {lat: cLat, lng: cLng, pm25: d, time: curTime};
		    		curGrid.rect.addListener('click', clickFn(op));
			    	curGrid.rect.setOptions({
			    		strokeWeight: strokeWeight,
						fillColor: fillColor,
			    	});
		    	}
			}
		}
		else{	//load
			var param = "date="+curYear+"/"+curDate;
			param += "&level="+level;
			param += "&minLat="+lat;
			param += "&minLng="+lng;
			param += "&maxLat="+(lat+step);
			param += "&maxLng="+(lng+step);
			$.get("/sensorGrid?"+param, function(result){
				var data = JSON.parse(result);
				var grid = pm25Grid[data.level];
				if(grid[key]) return;	//避免快速zoom或pan造成某些區塊同時load多次
				grid[key] = [];
				var json = data.data;
				for(var i=0;i<json.length;i++){
					var d = json[i];
					var t = d.time.split(":");
					var h = t[0];
					var m = Math.floor(t[1]/10)*10;
					var coord = d.gridY+","+d.gridX;
					if(grid[key][coord]){
						grid[key][coord].pm25[h+":"+m] = d.pm25;
					}
					else{
						var sensorData = {pm25: []};
						sensorData.pm25[h+":"+m] = d.pm25;
						sensorData.loc = new google.maps.LatLng(d.gridY, d.gridX);
						grid[key][coord] = sensorData;
					}
				}
				//create grid data in map
				//若get資料回傳前就zoom到別的level，就不顯示在map上
				var showMap = curLevel==data.level?map:null;
				for(var coord in grid[key]) {
					var curGrid = grid[key][coord];
					var d = curGrid.pm25[curTime];
					var preD = curGrid.pm25[preTime];

					if(showRelative){
			    		if(preD) fillColor = relativeColor(d-preD);
			    		else fillColor = relativeColor(0);
			    	}
			    	else{
			    		fillColor = ValueToColor(d);
			    	}

			    	var halfSize = 0.01*Math.pow(2,data.level)*0.5;
			    	var cLat = curGrid.loc.lat();
			    	var cLng = curGrid.loc.lng();
			    	var rectCoord = [
						{lat: cLat-halfSize, lng: cLng-halfSize},
						{lat: cLat-halfSize, lng: cLng+halfSize},
						{lat: cLat+halfSize, lng: cLng+halfSize},
						{lat: cLat+halfSize, lng: cLng-halfSize},
						{lat: cLat-halfSize, lng: cLng-halfSize}
			        ];

			        // Construct the polygon.
			        var rect = new google.maps.Polygon({
			    		paths: rectCoord,
			    		strokeColor: '#FFFFFF',
						strokeOpacity: 0.5,
						strokeWeight: strokeWeight,
						fillColor: fillColor,
						fillOpacity: opacity,
						map: showMap,
						zIndex: 1
			        });
			        var op = {lat: cLat, lng: cLng, pm25: d, time: curTime};
			        rect.listener = rect.addListener('click', clickFn(op));
			    	curGrid.rect = rect;
				}
				
			});
		}
	}
	for(var lat=minLat; lat<=maxLat; lat+=step){
		for(var lng=minLng; lng<=maxLng; lng+=step){
			UpdateGrid(level,lat,lng);
		}
	}
}

/*
function UpdateMapPM25(data, preData){
	var keyLength = Object.keys(data).length;
	if(keyLength == 0){
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

	var strokeWeight = showRelative?1:0;
	var sensitive = $("#sensitive").val();
	var relativeColor = d3.scale.linear().domain([0,30-sensitive]).range(["#00ff00", "#ff0000"]);
	var fillColor;
	for (var key in data) {
		var d = data[key];
		var preD = preData[key];
		var loc = new google.maps.LatLng(d.lat, d.lng);

	    if(pm25Array[d.siteID] == null){
	    	if(showRelative){
	    		if(preD) fillColor = relativeColor(d.pm25-preD.pm25);
	    		else fillColor = relativeColor(0);
	    	}
	    	else{
	    		fillColor = ValueToColor(d.pm25);
	    	}

	    	var circle = new google.maps.Circle({
		      strokeColor: '#FFFFFF',
		      strokeOpacity: 0.5,
		      strokeWeight: strokeWeight,
		      fillColor: fillColor,
		      fillOpacity: opacity,
		      map: map,
		      center: loc,
		      radius: radius*1000,	//單位公尺
		      zIndex: 1,
		    });
		    circle.listener = circle.addListener('click', clickFn(d));
	    	pm25Array[d.siteID] = circle;
	    }
	    else{
	    	var circle = pm25Array[d.siteID];
	    	if(showRelative){
	    		if(preD) fillColor = relativeColor(d.pm25-preD.pm25);
	    		else fillColor = relativeColor(0);
	    	}
	    	else{
	    		fillColor = ValueToColor(d.pm25);
	    	}
	    	google.maps.event.clearListeners(circle,'click');
	    	circle.addListener('click', clickFn(d));
	    	circle.setOptions({
	    		//center: loc,
	    		strokeWeight: strokeWeight,
	    		fillColor: fillColor,
	    	});
	    }
	}
}*/

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
			rect.listener = rect.addListener('click', clickFn(data,i,time));
			powerStationArray[d.name] = rect;
		}
		else{
			var rect = powerStationArray[d.name];
	    	google.maps.event.clearListeners(rect,'click');
	    	rect.addListener('click', clickFn(data,i,time));
			rect.setOptions({
	    		path: coord
	    	});
		}
		
	}
}

function UpdateMapTraffic(roadSegment, roadData){
	/*function clickFn(data, segment){ 
		return function() {
			var str = "<p>路段編號: "+data.roadID+"</p>";
			var loc = new google.maps.LatLng(segment.path[0].lat, segment.path[0].lng);
			roadWindow.setOptions({content: str, position: loc});
			roadWindow.open(map);
		};
	}
	if(roadWindow.getMap()){
		roadWindow.setOptions({map: null});
	}*/

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
			
			//roadPath.addListener('click', clickFn(d, road));
			roadArray[roadID] = roadPath;
		}
		else{
			roadArray[roadID].setOptions({
	    		strokeColor: color[d.level-1],
	    	});
	    	//google.maps.event.clearListeners(roadArray[roadID],'click');
		    //roadArray[roadID].addListener('click', clickFn(d, road));
		}
	}
}


function AddComment(location) {
	if(addMarker){
		var time = curYear+"/"+curDate+" "+curTime;
	    var str = "<p>時間 "+time+"</p>";
	    var round = 1000;
	    var lat = Math.floor(location.lat()*round)/round;
	    var lng = Math.floor(location.lng()*round)/round;
	    str += "<p>位置: ("+lat+","+lng+")</p>";
	    str += "<textarea name='comment' class='comment-text' placeholder='輸入註解'></textarea>";
	    str += "<div class='formBt-full' onclick='SaveComment(this,\""+time+"\","+location.lat()+","+location.lng()+");'>儲存</div>";
	    
		markerWindow.setOptions({content: str, position: location});
		markerWindow.open(map);

	    ToggleAddMarker();
	}
}

function MarkerClickFn(data){ 
	return function() {
	    var str = "<p>時間 "+data.time+"</p>";
	    var round = 1000;
	    var lat = Math.floor(data.position.lat()*round)/round;
	    var lng = Math.floor(data.position.lng()*round)/round;
	    str += "<input type='text' name='id' value='"+data.id+"' hidden>";
	    str += "<p>位置: ("+lat+","+lng+")</p>";
	    str += "<textarea name='comment' class='comment-text'>"+data.comment+"</textarea>";
	    str += "<div class='center'><div class='formBt' onclick='EditComment(this);'>儲存</div>";
	    str += "<div class='formBt' onclick='DeleteComment(\""+data.id+"\");'>刪除</div></div>";
	    markerWindow.setOptions({content: str, position: data.position});
	    markerWindow.open(map);
	};
}

function AddCommentMarker(id, time, lat, lng, comment){
	var location = new google.maps.LatLng(lat,lng);
	var marker = new google.maps.Marker({
        position: location, 
        map: map
    });
    marker.time = time;
    marker.id = id;
    marker.comment = comment;
    google.maps.event.clearListeners(marker,'click');
	marker.addListener('click', MarkerClickFn(marker));
    commentArray[id] = marker;
}

function ClickMarker(id){
	var marker = commentArray[id];
	if(!marker) return;
	google.maps.event.trigger(marker, 'click');
}

function EditComment(item){
	var parent = $(item).parent();
	var id = parent.siblings("input[name='id']").val();
	var content = parent.siblings("textarea[name='comment']").val();
	$.get("/comment-edit?comment="+id+"&content="+content, function(data){
		if(data == "ok"){
			//更新marker
			var marker = commentArray[id];
			marker.comment = content;
			google.maps.event.clearListeners(marker,'click');
			marker.addListener('click', MarkerClickFn(marker));
			//更新mapCommentData和comment panel
			var t = marker.time.split(" ")[1];
			var list = mapCommentData[t];
			for(var i=0;i<list.length;i++){
				if(list[i].id == id){
					list[i].comment = content;
				}
			}
			UpdateComment();

			markerWindow.close();
		}
	});
}

function DeleteComment(id){
	if(confirm("確定刪除?")){
		$.get("/comment-delete?comment="+id, function(data){
			if(data == "ok"){
				//刪掉map marker
				var marker = commentArray[id];
				marker.setOptions({map: null});
				//刪掉mapCommentData的comment
				var time = marker.time.split(" ")[1];
				var list = mapCommentData[time];
				for(var i=0;i<list.length;i++){
					if(list[i].id == id){
						list.splice(i, 1);
					}
				}
				UpdateComment();
				UpdateCommentDaily();
				markerWindow.close();
			}
		});
	}
}

function SaveComment(item, time, lat, lng){
    //save to server
    var form = $("#commentForm");
    var comment = $(item).siblings("textarea").val();
	form.children("input[name='time']").val(time);
	form.children("input[name='lat']").val(lat);
	form.children("input[name='lng']").val(lng);
	form.children("textarea[name='comment']").val(comment);

	var data = form.serialize();
    var formURL = form.attr("action");

    $.ajax({url: formURL,
		type: 'POST',
		data:  data,
		success: function(id){
			AddCommentMarker(id, time, lat, lng, comment);
			//新增mapCommentData的comment
		    var c = {};
			c.id = id;
			c.lat = lat;
			c.lng = lng;
			c.comment = comment;
			var t = time.split(" ")[1];
		    mapCommentData[t].push(c);
		    UpdateComment();	//更新comment list
		    UpdateCommentDaily();
		    markerWindow.close();
		}        
	});
}

function UpdateMapComment(commentData){
	for(var key in commentArray){
		commentArray[key].setOptions({
    		map: null
    	});
	}
	commentArray = [];
	var time = curYear+"/"+curDate+" "+curTime;
	for(var i=0;i<commentData.length;i++){
		var data = commentData[i];
		AddCommentMarker(data.id, time, data.lat, data.lng, data.comment);
	}
}

function GetUrlLoc() {
	var loc = {lat: 23.682094, lng: 120.7764642, zoom: 7};
	var param = decodeURIComponent(window.location.search.substring(1));
	var arr = param.split('&');

	for(var i=0;i<arr.length;i++){
		var p = arr[i].split("=");
		switch(p[0]){
			case "lat": loc.lat = parseFloat(p[1]); break;
			case "lng": loc.lng = parseFloat(p[1]); break;
			case "zoom": loc.zoom = parseInt(p[1]); break;
		}
	}
	return loc;
}

function InitMap() {
	var loc = GetUrlLoc();
	var taiwan = new google.maps.LatLng(loc.lat,loc.lng);

	map = new google.maps.Map(document.getElementById('map'), {
	  center: taiwan,
	  zoom: loc.zoom,
	  scaleControl: true,
	  //mapTypeId: google.maps.MapTypeId.SATELLITE
	  //mapTypeId: google.maps.MapTypeId.TERRAIN
	});
	curLevel = GetLevel();

	google.maps.event.addListener(map, 'click', function(event) {
	   AddComment(event.latLng);
	});

	map.addListener('dragend', function() {
		UpdateMapSensorGrid();
	});

	map.addListener('zoom_changed', function() {
		UpdateGridZoom();
		UpdateMapSensorGrid();
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
		$("#opLabel").html((opacity*100)+"%");
		/*for (var key in pm25Array) {
			pm25Array[key].setOptions({
	    		fillOpacity: opacity
	    	});
		}*/
		for(var i=0;i<levelNum;i++){
			var grid = pm25Grid[i];
			for(key in grid){
				var data = grid[key];
				for(coord in data){
					if(!data[coord].rect) continue;
					data[coord].rect.setOptions({
			    		fillOpacity: opacity
			    	});
				}
			}
		}
	});

	$("#colorIndex").change(function() {
		UpdateMapSensorGrid();
		var colorIndex = $("#colorIndex").val();
		switch(colorIndex){
			case "PM25":
				$("#colorIndexName").children("a").text("顏色:細懸浮微粒指標");
				break;
			case "NASA_PM25":
				$("#colorIndexName").children("a").text("顏色:NASA PM2.5");
				break;
			case "AQI":
				$("#colorIndexName").children("a").text("顏色:AQI指標");
				break;
		}
	});

	/*$("#pm25Radius").change(function(){
		var radius = $("#pm25Radius").val();	//單位公里
		for (var key in pm25Array) {
			pm25Array[key].setOptions({
	    		radius: radius*1000	//單位公尺
	    	});
		}
		$("#radiusLabel").html(radius+"公里");
	});*/

	pm25Grid = [];
	for(var i=0;i<levelNum;i++){
		pm25Grid[i] = [];
	}
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

function ToggleRelative(){
	showRelative = $("#showRelative").is(":checked");
}

function ToggleComment(){
	showComment = $("#showComment").is(":checked");
	var showMap = showComment?map:null;
	for(var key in commentArray){
		commentArray[key].setOptions({map: showMap});
	}
}

function ToggleAddMarker(){
	function SetItemClickable(clickable){
		for(var i=0;i<levelNum;i++){
			var grid = pm25Grid[i];
			for(key in grid){
				var data = grid[key];
				for(coord in data){
					if(!data[coord].rect) continue;
					data[coord].rect.setOptions({
			    		clickable: clickable
			    	});
				}
			}
		}
		/*for(var key in pm25Array){
			pm25Array[key].setOptions({
	    		clickable: clickable
	    	});
		}*/
		for(var key in weatherArray){
			weatherArray[key].setOptions({
	    		clickable: clickable
	    	});
		}
		for(var key in powerStationArray){
			powerStationArray[key].setOptions({
	    		clickable: clickable
	    	});
		}
		for(var key in roadArray){
			roadArray[key].setOptions({
	    		clickable: clickable
	    	});
		}
	}

	addMarker = !addMarker;
	if(addMarker){
		$("#commentIcon").attr("src","/static/image/commentIcon_active.png");
		map.setOptions({draggableCursor:'crosshair'});
		SetItemClickable(false);
	}
	else{
		$("#commentIcon").attr("src","/static/image/commentIcon.png");
		map.setOptions({draggableCursor:'default'});
		SetItemClickable(true);
	}
}

google.maps.event.addDomListener(window, 'load', InitMap);