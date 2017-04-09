module.exports = function(sequelize, DataTypes) {
	return sequelize.define("commentDailyNum", {
	  	id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true
		},
		userID: {
			type: DataTypes.UUID,
	    	references: { model: "users", key: "id" },
	    	alowNull: false
		},
		date:{
			type: DataTypes.DATE,
	    	allowNull: false
		},
		num:{
			type: DataTypes.INTEGER,
	    	defaultValue: 0
		}
	});
};