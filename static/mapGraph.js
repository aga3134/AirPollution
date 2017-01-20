var map;
var circleArray = [];

function ValueToColor(v){
	function componentToHex(c) {
	    var hex = c.toString(16);
	    return hex.length == 1 ? "0" + hex : hex;
	}
	function rgb(r,g,b){
		return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
	}
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

function UpdateMap(data){
	if(data.length == 0){
		$(".map-loading").css("display","block");
	}
	else{
		$(".map-loading").css("display","none");
	}
	var opacity = $("#opacity").val();
	for(var i=0;i<data.length;i++){
		var d = data[i];
		var loc = {};
		loc.location = new google.maps.LatLng(d.lat, d.lng);

	    if(circleArray[d.siteID] == null){
	    	var circle = new google.maps.Circle({
		      strokeColor: '#000000',
		      strokeOpacity: 0.0,
		      strokeWeight: 0,
		      fillColor: ValueToColor(d.pm25),
		      fillOpacity: opacity,
		      map: map,
		      center: loc.location,
		      radius: 2000
		    });
	    	circleArray[d.siteID] = circle;
	    }
	    else{
	    	circleArray[d.siteID].setOptions({
	    		//center: loc.location,
	    		fillColor: ValueToColor(d.pm25)
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
		for (var key in circleArray) {
			circleArray[key].setOptions({
	    		fillOpacity: opacity
	    	});
		}

	});

}

google.maps.event.addDomListener(window, 'load', InitMap);