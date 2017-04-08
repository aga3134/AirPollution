module.exports = function(sequelize, DataTypes) {
	return sequelize.define("comment", {
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
		time:{
			type: DataTypes.DATE,
	    	allowNull: false
		},
		lat:{
			type: DataTypes.FLOAT,
	    	alowNull: false
		},
		lng:{
			type: DataTypes.FLOAT,
	    	alowNull: false
		},
	    comment:{
	    	type: DataTypes.TEXT,
	    	alowNull: false
	    }
	});
};