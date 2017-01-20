var mongoose = require('mongoose');

//氣象站資料
var WeatherStationSchema = new mongoose.Schema({
	_id : String,		//站台id
	lat  : Number,	//緯度(單位度)
	lng : Number,	//經度(單位度)
	name : String,		//站名
	city: String,		//縣市
	town: String		//鄉鎮
}, {collection: "WeatherStations"});

module.exports = mongoose.model('WeatherStation', WeatherStationSchema);