
var schedule = require("node-schedule");
var dataToDB = require("./dataToDB");

var registerTask = {};

//*    *    *    *    *    *
//┬    ┬    ┬    ┬    ┬    ┬
//│    │    │    │    │    |
//│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
//│    │    │    │    └───── month (1 - 12)
//│    │    │    └────────── day of month (1 - 31)
//│    │    └─────────────── hour (0 - 23)
//│    └──────────────────── minute (0 - 59)
//└───────────────────────── second (0 - 59, OPTIONAL)

//重開server後要加入的task
registerTask.InitTask = function(){
	//啟動時更新一次資料
	dataToDB.DataFolderToDB();
	//之後每小時更新資料
	schedule.scheduleJob('0 0 * * * *', function(){
		dataToDB.DataFolderToDB();
	});
};


module.exports = registerTask;
