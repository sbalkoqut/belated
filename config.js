var fs = require("fs");
var readline = require("readline");
var log = require("./log")("CONF");
var config;

function loadConfiguration(loaded) {
    function getEmail(callback) {
        if (isEmpty(configuration.gmail)) {
            readinterface.question("Specify gmail account to use (e.g. \"calqut@gmail.com\"): ", function (answer) {
                configuration.gmail = answer;
                callback();
            })
        }
        else
            callback();
    }

    function getPassword(callback) {
        if (isEmpty(configuration.password)) {
            readinterface.question("Specify password to use: ", function (answer) {
                configuration.password = answer;
                callback();
            })
        }
        else
            callback();
    }

    function getBingKey(callback) {
        if (isEmpty(configuration.bingkey)) {
            readinterface.question("Specify Bing API Key to use: ", function (answer) {
                configuration.bingkey = answer;
                callback();
            })
        }
        else
            callback();
    }

    function isEmpty(string) {
        return (string === undefined) || (string === null) || (typeof string !== "string") || (string.length === 0);
    }

    function onload() {
        template.notificationsender.auth.user = configuration.gmail;
        template.notificationsender.auth.pass = configuration.password;
        template.imap.user = configuration.gmail;
        template.imap.password = configuration.password;
        template.email = configuration.gmail;
        template.bingkey = configuration.bingkey;
        config = template;
        loaded(config);
    }

    if (loaded === undefined || loaded === null)
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
        email: undefined,
        bingkey: undefined
    };

    var configuration = {};

    try {
        var data = fs.readFileSync("config.json");
        configuration = JSON.parse(data);
    }
    catch (error) {
        log("Couldn't read configuration file. " + error);
    }

    


    if (isEmpty(configuration.gmail) || isEmpty(configuration.password) || isEmpty(configuration.bingkey)) {

        var readinterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });



        getEmail(function () {
            getPassword(function () {
                getBingKey(function () {

                    readinterface.close();
                    try {
                        var data = JSON.stringify(configuration);
                        fs.writeFileSync("config.json", data);
                        log("Configuration saved to config.json.");
                    }
                    catch (error) {
                        log("Couldn't write configuration file. " + error);
                    }

                    onload();
                });
            });
        });
    }
    else {
        log("Configuration loaded.");
        onload();
    }
}


exports = module.exports = loadConfiguration;