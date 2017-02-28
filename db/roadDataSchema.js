var mongoose = require('mongoose');

//交通資料
var RoadDataSchema = new mongoose.Schema({
	_id : String,		//roadID+time
	roadID: String,		//資料來源測站
	level: Number,		//1:順暢 2:車多 3:車多 4:壅塞
	speed: Number,		//車速 >79km/h -> L1, 59~79km/h -> L2, 39~59km/h -> L3, <39km/h -> L4
	travelTime: Number,	//行車時間
	time: Date,			//記錄時間
});

module.exports = RoadDataSchema;