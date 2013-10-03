var fs = require("fs");
var readline = require("readline");
var log = require("./log")("CONF");
var config;

var configSchema = 
    {
        gmail: 'the gmail account email',
        password: 'the gmail account password',
        bingkey: 'the Bing API Key',
        mongoconnection: 'the Mongo DB connection string',
        sitedomain: 'the live website domain'
    };

var template = {
        notificationsender: {
            service: "Gmail",
            auth: {
                user: undefined,
                pass: undefined
            }
        },
        imap: {
            user: undefined,
            password: undefined,
            host: "imap.gmail.com",
            port: 993,
            secure: true
        },
        email: undefined,
        bingkey: undefined,
        mongoconnection: undefined
};

function loadConfiguration(loaded) {
    

    if (loaded === undefined || loaded === null)
        return config;
    if (config)
        loaded(config);

    var configuration = {};

    try {
        var data = fs.readFileSync("config.json");
        configuration = JSON.parse(data);
    }
    catch (error) {
        log("Couldn't read configuration file. " + error);
    }


    function isEmpty(string) {
        return (string === undefined) || (string === null) || (typeof string !== "string") || (string.length === 0);
    }

    var readinterface;

    function completeConfiguration(callback) {
        function completeValue(parameter, description, callback) {
            if (isEmpty(configuration[parameter])) {
                readinterface.question("Specify " + description + " to use: ", function (answer) {
                    configuration[parameter] = answer;
                    callback();
                });
            }
            else
                callback();
        }

        for (var parameter in configSchema) {
            if (isEmpty(configuration[parameter])) {
                if (readinterface === undefined) {
                    readinterface = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                }

                completeValue(parameter, configSchema[parameter], function () {
                    completeConfiguration(callback);
                });
                return;
            }
        }

        if (readinterface !== undefined)
        {
            readinterface.close();
            try {
                var data = JSON.stringify(configuration);
                fs.writeFileSync("config.json", data);
                log("Configuration saved to config.json.");
            }
            catch (error) {
                log("Couldn't write configuration file. " + error);
            }
        }

        callback();
    }
    completeConfiguration(function () {
        log("Configuration loaded.");
        template.notificationsender.auth.user = configuration.gmail;
        template.notificationsender.auth.pass = configuration.password;
        template.imap.user = configuration.gmail;
        template.imap.password = configuration.password;
        template.email = configuration.gmail;
        template.bingkey = configuration.bingkey;
        template.mongoconnection = configuration.mongoconnection;
        template.sitedomain = configuration.sitedomain;
        config = template;

        loaded(config);
    });

}


exports = module.exports = loadConfiguration;