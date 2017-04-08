var config = {};

config.googleAuth = {
	'clientID'      : 'YourClientID',
	'clientSecret'  : 'YourClientSecret',
	'callbackURL'   : 'http://YourHostDomain/auth/google/callback'
};

config.mysqlAuth = {
    dbName: 'YourDatabaseName',
    username: 'YourDatabaseUserName',
    password: 'YourDatabasePassword'
};

config.sessionConfig = {
	secret: "YourSessionSecret"
}

config.serverPort = 8001;

module.exports = config;