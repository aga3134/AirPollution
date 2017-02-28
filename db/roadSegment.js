var mongoose = require('mongoose');

//路段資料
var RoadSegmentSchema = new mongoose.Schema({
	_id : String,
	path: String
}, {collection: "RoadSegments"});

module.exports = mongoose.model('RoadSegment', RoadSegmentSchema);