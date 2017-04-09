var Sequelize = require('sequelize');
var Config = require('../config');

var mysqlDB = {};
var mysql = process.env.MYSQL_SERVER || '127.0.0.1';
mysqlDB.Init = function(){
	mysqlDB.sequelize = new Sequelize(Config.mysqlAuth.dbName, Config.mysqlAuth.username, Config.mysqlAuth.password,
								 {host: mysql, port: '3306', logging: false});
	mysqlDB.User = mysqlDB.sequelize.import(__dirname + "./../mysql/user.js");
	mysqlDB.Comment = mysqlDB.sequelize.import(__dirname + "./../mysql/comment.js");
	mysqlDB.CommentDailyNum = mysqlDB.sequelize.import(__dirname + "./../mysql/commentDailyNum.js");
	
	var syncOp = {};
	syncOp.force = false;
    mysqlDB.sequelize.sync(syncOp);
}

module.exports = mysqlDB;
