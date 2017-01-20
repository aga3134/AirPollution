var imageArr = [];
var imageNum = 16;
var curIndex = 0;
var imageTimerID;

function SetupImageSrc(date){
  curIndex = 0;
  var arr = date.split("/");
  if(arr[1].length == 1) arr[1] = "0"+arr[1];
  if(arr[2].length == 1) arr[2] = "0"+arr[2];
  date = arr[0]+"-"+arr[1]+"-"+arr[2];
  $("#pm25Image").attr("src", "/static/image/noData.png");

  imageArr = [];
  for(var i=1;i<=imageNum;i++){
    imageArr[i] = "/static/image/noData.png";
  }

  function LoadImageRec(arr, i){
    if(i >= arr.length) return $("#pm25Image").attr("src", imageArr[1]);
    var index = i.toString();
    if(index.length == 1) index = "0"+index;
    var url = "/data/graph/"+date+"/pm25_asia_"+index+".png";

    $.get(url).done(function() {
        imageArr[i] = url;
        LoadImageRec(arr, i+1);
    });
  }
  LoadImageRec(imageArr, 1);

  if(imageTimerID != null){
    clearInterval(imageTimerID);
  }
  $('#pm25ImageAutoPlay').prop('checked', false);
}

function ChangeImage(){
  $("#pm25Image").attr("src", imageArr[curIndex]);
  curIndex = (curIndex+1)%imageNum;
}

function ChangeImageByTime(time){
  if($("#pm25ImageAutoPlay").is(":checked")) return;
  var arr = time.split(":");
  curIndex = Math.floor(arr[0]/3)+9;
  $("#pm25Image").attr("src", imageArr[curIndex]);
}

window.addEventListener('load', function() {
  $("#pm25ImageAutoPlay").change(function(){
    if($("#pm25ImageAutoPlay").is(":checked")){
      imageTimerID = setInterval(ChangeImage, 500);
    }
    else{
      clearInterval(imageTimerID);
      imageTimerID = null;
    }
  });
});