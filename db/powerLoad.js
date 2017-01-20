var mongoose = require('mongoose');

//各區用電量(單位萬瓩)
var PowerLoadSchema = new mongoose.Schema({
	_id : Date,			//time
	north: Number,		//北部
	central: Number,	//中部
	south: Number,		//南部
	east: Number,		//東部
}, {collection: "PowerLoads"});

module.exports = mongoose.model('PowerLoad', PowerLoadSchema);