module.exports = function(sequelize, DataTypes) {
	return sequelize.define("memo", {
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
	    memo:{
	    	type: DataTypes.TEXT,
	    	alowNull: false
	    }
	});
};