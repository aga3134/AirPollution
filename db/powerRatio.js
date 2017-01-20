var mongoose = require('mongoose');

//各型式發電量(單位萬瓩)
var PowerRatioSchema = new mongoose.Schema({
	_id : Date,			//time
	nuclear: Number,	//核能
	coal: Number,		//燃煤
	coGen: Number,		//氣電共生
	ippCoal: Number,	//民營-燃煤
	lng: Number,		//燃氣
	ippLng: Number,		//民營-燃氣
	oil: Number,		//重油
	diesel: Number,		//輕油
	hydro: Number,		//水力
	wind: Number,		//風力
	solar: Number,		//太陽能
	pumpGen: Number,	//抽蓄發電
	pumpLoad: Number,	//抽蓄負載
}, {collection: "PowerRatios"});

module.exports = mongoose.model('PowerRatio', PowerRatioSchema);