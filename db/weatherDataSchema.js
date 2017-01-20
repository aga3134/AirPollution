var mongoose = require('mongoose');

//氣象資料
var WeatherDataSchema = new mongoose.Schema({
	_id : String,		//站台id+time
	siteID: String,		//站台id
	height: Number,		//海拔高度(單位公尺)
	wDir  : Number,		//風向，(單位度)
	wSpeed : Number,	//風速，(單位公尺/秒)
	t : Number,			//溫度，單位攝氏
	h: String,			//溼度，單位百分率
	p: String,			//壓力，單位百帕
	sun : Number,		//日照時數
	rain : Number,		//日累積雨量
	time: Date,			//記錄時間
});

module.exports = WeatherDataSchema;