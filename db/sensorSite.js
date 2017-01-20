var mongoose = require('mongoose');

//空汙測站資料
var SensorSiteSchema = new mongoose.Schema({
	_id : String,		//站台id
	lat  : Number,		//緯度
	lng : Number,		//經度
	name : String,		//站名
	type: String		//sensor device type (airbox, lass-airbox, taiwan official)
}, {collection: "SensorSites"});

module.exports = mongoose.model('SensorSite', SensorSiteSchema);