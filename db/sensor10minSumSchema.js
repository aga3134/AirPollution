var mongoose = require('mongoose');

//pm2.5數值各區總和
//north(>24.5),central(23.5~24.5),south(<23.5)
var Sensor10minSumSchema = new mongoose.Schema({
	_id: Date,			//time
	northSum: {			//北區pm2.5數值總和，單位μg/m3
		type: Number,
		default: 0
	},
	northNum: {
		type: Number,
		default: 0
	},
	centralSum: {
		type: Number,
		default: 0
	},
	centralNum: {
		type: Number,
		default: 0
	},
	southSum: {
		type: Number,
		default: 0
	},
	southNum: {
		type: Number,
		default: 0
	},
});

//module.exports = mongoose.model('Sensor10minSum', Sensor10minSumSchema);
module.exports = Sensor10minSumSchema;