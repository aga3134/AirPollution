var mongoose = require('mongoose');

//發電機組資料
var PowerStationSchema = new mongoose.Schema({
	_id : String,		//type+name
	name: String,		//機組名稱
	lat  : Number,	//緯度
	lng : Number,	//經度
	capacity: Number,	//最大發電量，(單位MW)
	type: String,		//發電型式: nuclear核能, coal燃煤, co-gen汽電共生, ipp-coal民營-燃煤, lng燃氣, ipp-lng民營-燃氣, oil重油, diesel輕油, hydro水力, wind風力, solar太陽能, pumping-gen抽蓄發電, pumping-load
}, {collection: "PowerStations"});

module.exports = mongoose.model('PowerStation', PowerStationSchema);