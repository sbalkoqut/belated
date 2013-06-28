var fs = require("fs");
var readline = require("readline");

var config;

function loadConfiguration(onload) {
    if (onload === undefined || onload === null)
        return config;
    if (config)
        onload(config);

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
        email: undefined
    };

    var configuration = {};

    try {
        var data = fs.readFileSync("config.json");
        configuration = JSON.parse(data);
    }
    catch (error) {
        console.log("Couldn't read configuration file. " + error);
        throw error;
    }

    if (configuration.gmail === undefined || configuration.pass === undefined) {

        var readinterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        function getEmail(callback) {
            if (!configuration.gmail) {
                readinterface.question("Specify gmail account to use (e.g. \"calqut@gmail.com\"): ", function (answer) {
                    configuration.gmail = answer;
                    callback();
                })
            }
            else
                callback();
        }
        function getPassword(callback) {
            if (!configuration.password || configuration.password.length === 0) {
                readinterface.question("Specify password to use: ", function (answer) {
                    configuration.password = answer;
                    callback();
                })
            }
            else
                callback();
        }

        getEmail(function () {
            getPassword(function () {
                readinterface.close();

                template.notificationsender.auth.user = configuration.gmail;
                template.notificationsender.auth.pass = configuration.password;
                template.imap.user = configuration.gmail;
                template.imap.password = configuration.password;
                template.email = configuration.gmail;
                config = template;
                onload(config);
            });
        });
    }
}


exports = module.exports = loadConfiguration;