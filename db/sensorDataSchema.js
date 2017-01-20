var mongoose = require('mongoose');

//空汙資料
var SensorDataSchema = new mongoose.Schema({
	_id : String,			//siteID+time
	siteID: String,			//資料來源測站
	pm25: Number,			//單位μg/m3
	t: Number,		//溫度，單位攝氏
	h: Number,		//溼度，單位百分率
	time: Date,		//記錄時間
});

module.exports = SensorDataSchema;