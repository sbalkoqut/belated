



var loadConfiguration = require('./config');

loadConfiguration(
    function start(configuration) {

/**
 * Module dependencies.
 */
        var express = require('express')
          , routes = require('./routes')
          , user = require('./routes/user')
          , http = require('http')
          , path = require('path')
          , emailClient = require('./emailclient')
          , imap = require('imap')
          , emailHandler = require('./emailhandler')
          , locationHandler = require('./locationhandler')
          , inspect = require('util').inspect
          , notifications = require('./notificationmanager');

    var app = express();

    // all environments
    app.set('port', process.env.PORT || 80);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    // development only
    if ('development' == app.get('env')) {
        app.use(express.errorHandler());
    }



    app.get('/', routes.index);
    app.get('/users', user.list);

    var notificationManager = notifications(app);

    app.all('/location', locationHandler(function (error, location) {
        if (error)
            console.log("[LOCATION] An update failed. " + error);
        else {
            console.log("[LOCATION] received: " + inspect(location));
            notificationManager.handleLocation(location);
        }
    }));


    emailClient(
        new imap(configuration.imap),
        emailHandler(function (error, meeting) {
            if (error)
                console.log("A meeting was not added. " + error);
            else {
                console.log("Meeting received: " + inspect(meeting));
                notificationManager.handleMeeting(meeting);
            }
        }),
        true);

    var httpServer = http.createServer(app);
    httpServer.on("error", function (error) {
        console.log();
        if (error.code == "EADDRINUSE") {
            console.log("[ERROR] Couldn't start HTTP server: The port in use.");
        }
        else {
            console.log("[ERROR] Problem with HTTP server:");
            console.log(error);
        }
        console.log();
        process.exit(1);
    });
    httpServer.listen(app.get('port'), function () {
        console.log('[HTTP] Express server listening on port ' + app.get('port'));
    });
});