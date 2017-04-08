module.exports = function(sequelize, DataTypes) {
	return sequelize.define("user", {
	  	id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true
		},
		provider: {
			type: DataTypes.ENUM,
			values: ['google', 'facebook', 'local'],
			alowNull: false
		},
		oauthID:{
			type: DataTypes.STRING,
			alowNull: false
		},
		oauthToken:{
			type: DataTypes.STRING,
			alowNull: false
		},
		email:{
			type: DataTypes.STRING,
			alowNull: false,
			validate:{
				isEmail: true
			}
		},
	    name:{
	    	type: DataTypes.STRING,
	    	alowNull: false
	    }
	});
};