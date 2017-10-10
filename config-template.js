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

config.smtpConfig = {
	host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: 'YourGmail',  //需到 https://www.google.com/settings/security/lesssecureapps 改成less secure
        pass: 'YourPassword'
    },
    dst: "TheEmailDesinationYouWantToSend"
};

config.dataSrcFolder = "./data/";
config.dataDoneFolder = "./data/done/";
config.gridPerUnit = 100;
config.levelNum = 6;

config.serverPort = 8001;

module.exports = config;