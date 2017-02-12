
var cellSize = 20; // cell size

var color = d3.scale.linear()
    .domain([0, 11, 23, 35, 41, 47, 53, 58, 64, 70])
    .range(["#9CFF9C", "#31FF00", "#31CF00", "#FFFF00", "#FFCF00", 
          "#FF9A00", "#FF6464", "#FF0000", "#990000", "#CE30FF"]);

Date.prototype.incDate = function() {
    this.setDate(this.getDate() + 1);
}

Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}

function AddDate(date, value){
  var result = new Date(date);
  result.setDate(date.getDate()+value);
  return result;
}

function LoadDayGraph(callback){
  var year = parseInt($("#showYear").val());
  $.get("/sensorDailySum?year="+year, function(data){
    var json = JSON.parse(data);
    var sensorAvg = [];
    for(var i=0;i<json.length;i++){
      var avg = json[i];
      var d = {};
      d.northAvg = avg.northSum/avg.northNum;
      d.centralAvg = avg.centralSum/avg.centralNum;
      d.southAvg = avg.southSum/avg.southNum;
      var dateArr = avg._id.split("/");
      sensorAvg[dateArr[1]+"/"+dateArr[2]] = d;
    }
    DrawDayGraph(sensorAvg);
    callback(curDate);
  });
}

function DrawDayGraph(sensorData) {
  var dayContainer = $("#dayContainer");
  dayContainer.html("");
  var w = Math.min($("body").width(), dayContainer.width());
  var offsetX = (w-53*cellSize)*0.5;
  if(offsetX < 40) offsetX = 40;
  var offsetY = cellSize;
  
  var year = parseInt($("#showYear").val());
  var startDate = new Date(year,0,1);
  var endDate = new Date(year+1,0,1);
 
  for(var d=startDate;d<endDate;d.incDate()){
    var m = d.getMonth();
    var w = d.getWeek();
    var weekDay = d.getDay();

    //add day block
    var day = (d.getMonth()+1)+"/"+d.getDate();
    var html = $("<div></div>");
    html.attr("class","day-bt");
    html.attr("data-date",day);
    html.attr("onmouseover","ShowDate('"+day+"');");
    html.attr("onmouseout","ShowDate();");
    html.css("border","1px solid #EEE");

    //html.css("top",weekDay*cellSize);
    //html.css("left",(w-1)*cellSize+offsetX);
    html.css("top",m*cellSize+offsetY+2);
    var firstWeekDay = new Date(year,m,1);
    var coordX = d.getDate()+firstWeekDay.getDay();
    html.css("left",coordX*cellSize+offsetX);

    var avg = sensorData[day];
    if(avg){
      html.css("background","linear-gradient("+color(avg.northAvg)+","+color(avg.centralAvg)+","+color(avg.southAvg)+")");
      html.attr("onclick","ChangeDate('"+day+"');");
    }
    else{
      html.css("background","white");
    }
    
    //add month border
    /*var nl = AddDate(d,-7), nr = AddDate(d,7);
    var nt = AddDate(d,-1), nb = AddDate(d,1);
    var borderStyle = "2px solid blue";
    if(nr.getMonth() != m) html.css("border-right",borderStyle);
    if(nt.getMonth() != m || weekDay == 0) html.css("border-top",borderStyle);
    if(nl.getMonth() == 11 && m != 11) html.css("border-left",borderStyle);
    if(weekDay == 6 || (m == 11 && nb.getMonth() != 11)) html.css("border-bottom",borderStyle);*/
    dayContainer.append(html);
  }
  //add select block
  var selectBlock = $("<div></div>");
  selectBlock.attr("class","day-bt select");
  selectBlock.attr("id","selectBlock");
  selectBlock.css("background-color","transparent");
  dayContainer.append(selectBlock);

  //add month label
  for(var i=0;i<12;i++){
    var html = $("<div>"+(i+1)+"月</div>");
    html.attr("class","time-label");
    //html.css("top",cellSize*7);
    //html.css("left",offsetX+(i)*53*cellSize/12);
    html.css("top",cellSize*i+offsetY);
    html.css("left",0);
    dayContainer.append(html);

    html = $("<div>"+(i+1)+"月</div>");
    html.attr("class","time-label");
    html.css("top",cellSize*i+offsetY);
    html.css("left",(7*6)*cellSize+offsetX);
    dayContainer.append(html);
  }
  //add weekday label
  //for(var i=0;i<7;i++){
  for(var i=0;i<7*6;i++){
    var wd = "";
    //switch(i){
    switch(i%7){
      case 0: wd = "日"; break;
      case 1: wd = "一"; break;
      case 2: wd = "二"; break;
      case 3: wd = "三"; break;
      case 4: wd = "四"; break;
      case 5: wd = "五"; break;
      case 6: wd = "六"; break;
    }
    var html = $("<div>"+wd+"</div>");
    html.attr("class","time-label");
    //html.css("top",i*cellSize);
    //html.css("left",offsetX-20);
    html.css("top",0);
    html.css("left",i*cellSize+offsetX);
    dayContainer.append(html);

    /*var html = $("<div>"+wd+"</div>");
    html.attr("class","time-label");
    html.css("top",i*cellSize);
    html.css("left",offsetX+cellSize*53+5);
    dayContainer.append(html);*/
  }
}
