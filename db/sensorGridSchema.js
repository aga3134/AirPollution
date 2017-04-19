var mongoose = require('mongoose');

//空汙網格資料
var SensorGridSchema = new mongoose.Schema({
	level: Number, 	//網格密度0~5
	gridX: Number,	//格點y軸座標
	gridY: Number,	//格點x軸座標
	time: Date,		//記錄時間
	//weighted sum
	pm25: Number,	//單位μg/m3
	t: Number,		//溫度，單位攝氏
	h: Number,		//溼度，單位百分率
	weight: Number	//依測站到格點距離weighting
});
SensorGridSchema.index({level:1, gridX:1, gridY:1, time:1}, { unique: true });

module.exports = SensorGridSchema;