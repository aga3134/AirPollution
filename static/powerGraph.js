var parseTime = d3.time.format("%H:%M:%S").parse;
var margin = {top: 20, right: 20, bottom: 30, left: 40};
var loadInfo, ratioInfo;

function DrawStackArea(id, json){
  var info = {};
  info.keyArr = d3.keys(json[0]).filter(function(key) { return key !== "_id"; });

  var color = d3.scale.category20();
  color.domain(info.keyArr);

  json.forEach(function(d) {
    d._id = parseTime(d._id);
  });

  var svg = d3.select(id);
  svg.html("");
  
  var width = $(id).width() - margin.left - margin.right;
  var height = $(id).height() - margin.top - margin.bottom;

  //設定數值範園
  info.x = d3.time.scale().range([0, width]);
  info.y = d3.scale.linear().range([height, 0]);
  var xAxis = d3.svg.axis().scale(info.x).orient("bottom").tickFormat(d3.time.format("%H"));
  var yAxis = d3.svg.axis().scale(info.y).orient("left");

  var maxDateVal = d3.max(json, function(d){
    var vals = d3.keys(d).map(function(key){ return key !== "_id" ? d[key] : 0 });
    return d3.sum(vals);
  });
  //x.domain(d3.extent(json, function(d) { return d._id; }));
  info.x.domain([parseTime("0:0:0"), parseTime("24:0:0")]);
  info.y.domain([0, maxDateVal]);

  //use stack area graph
  var stack = d3.layout.stack().values(function(d) { return d.values; });
  stack.order("reverse");
  var browsers = stack(color.domain().map(function(name) {
    return {
      name: name,
      values: json.map(function(d) {
        return {time: d._id, y: d[name]};
      })
    };
  }));

  var area = d3.svg.area()
    .x(function(d) { return info.x(d.time); })
    .y0(function(d) { return info.y(d.y0); })
    .y1(function(d) { return info.y(d.y0 + d.y); });

  //draw in svg
  svg = svg
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var browser = svg.selectAll(".browser")
      .data(browsers)
    .enter().append("g")
      .attr("class", "browser");

  browser.append("path")
      .attr("class", "area")
      .attr("d", function(d) { return area(d.values); })
      .style("fill", function(d) { return color(d.name); });

  //draw axis
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  //draw power info
  var graphID = id.substr(1,id.length);
  var time = parseTime("0:0:0");
  svg.append("line")
      .attr("id", graphID+"timeline")
      .attr("x1", info.x(time))
      .attr("x2", info.x(time))
      .attr("y1", info.y(0))
      .attr("y2", info.y(maxDateVal))
      .style("stroke", "red")
      .style("stroke-width","2");
/*
  svg.selectAll(".power-text").data(nestTime)
    .enter().append("text")
      .attr("class", "power-text")
      .attr("x", x(time)+10)
      .attr("y", function(d){
        var curValue = d.values.filter(function(t){return t.time.valueOf() === time.valueOf();});
        return y(curValue[0].y0);
      })
      .style("fill", "white")
      .text(function(d){return d.name;});*/

  info.timeHash = [];
  for(var i=0;i<json.length;i++){
    info.timeHash[json[i]._id] = json[i];
  }

  var stepY = info.y(0)/info.keyArr.length;
  var offsetX = info.x(parseTime("23:59:59"))-130;
  for(var i=0;i<info.keyArr.length;i++){
    var offsetY = (i+0.5)*stepY;
    svg.append("rect")
      .attr("id", graphID+info.keyArr[i]+"bg")
      .attr("width","120")
      .attr("height","20")
      .attr("x", offsetX)
      .attr("y", offsetY-14)
      .attr("stroke","white")
      .style("fill", color(info.keyArr[i]));

    svg.append("text")
      .attr("id", graphID+info.keyArr[i]+"text")
      .attr("x", offsetX+10)
      .attr("y", offsetY)
      .style("fill", "white")
      .text(function(){
        var key = info.keyArr[i];
        var value = info.timeHash[time];
        return KeyToStr(key)+": "+(value?value[key]:0);
      });
  }
  return info;
}

function KeyToStr(key){
  switch(key){
    case "nuclear": return "核能"; break;
    case "coal": return "燃煤"; break;
    case "coGen": return "氣電共生"; break;
    case "ippCoal": return "民營-燃煤"; break;
    case "lng": return "燃氣"; break;
    case "ippLng": return "民營-燃氣"; break;
    case "oil": return "重油"; break;
    case "diesel": return "輕油"; break;
    case "hydro": return "水力"; break;
    case "wind": return "風力"; break;
    case "solar": return "太陽能"; break;
    case "pumpGen": return "抽蓄發電"; break;
    case "pumpLoad": return "抽蓄負載"; break;
    case "north": return "北部"; break;
    case "central": return "中部"; break;
    case "south": return "南部"; break;
    case "east": return "東部"; break;
  }
}

function DrawPowerInfo(id, time, info){
  if(!info) return;
  time = parseTime(time+":0");
  var offsetX = info.x(time);

  var timeline = $(id+"timeline");
  timeline.attr("x1",offsetX);
  timeline.attr("x2",offsetX);

  if(time > parseTime("12:0:0")){
    offsetX = info.x(parseTime("0:0:0"))+10;
  }
  else{
    offsetX = info.x(parseTime("23:59:59"))-130;
  }

  for(var i=0;i<info.keyArr.length;i++){
    var bg = $(id+info.keyArr[i]+"bg");
    bg.attr("x",offsetX);
    
    var text = $(id+info.keyArr[i]+"text");
    text.attr("x",offsetX+10)
      .text(function(){
        var key = info.keyArr[i];
        var value = info.timeHash[time];
        return KeyToStr(key)+": "+(value?value[key]:0);
      });
  }
}

function SetPowerGraphTime(time){
    DrawPowerInfo("#powerRatio", time, ratioInfo);
    DrawPowerInfo("#powerLoad", time, loadInfo);
}

function LoadPowerGraph(date){
  d3.json("/powerRatio?date="+date, function(err, json){
    ratioInfo = DrawStackArea("#powerRatio", json);
  });

  d3.json("/powerLoad?date="+date, function(err, json){
    loadInfo = DrawStackArea("#powerLoad", json);
  });
}