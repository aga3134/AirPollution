var mongoose = require('mongoose');

//各機組發電量(單位MW)
var PowerGenSchema = new mongoose.Schema({
	_id : String,		//stationID+time
	stationID: String,	//機組ID
	powerGen  : Number,	//發電量
	remark: String,		//備註
	time: Date,			//發電時間
});

module.exports = PowerGenSchema;