﻿
function start(configuration) {

    var express = require('express')
                , routes = require('./routes')
                , http = require('http')
                , path = require('path')
                , emailClient = require('./emailclient')
                , imap = require('imap')
                , emailHandler = require('./emailhandler')
                , locationHandler = require('./locationhandler')
                , inspect = require('util').inspect
                , notifications = require('./notificationmanager')
                , log = require('./log')("main")
                , persistancy = require("./persistancy");

    var app = express();
    app.set('port', 80);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    // development only
    if ("development" == app.get("env")) {
        app.use(express.errorHandler());
    }

    persistancy.connect(function (error, dataStores) {
        if (error) {
            log("Failed to connect to persistency. " + error);
            process.exit(1);
        }
        log("Connected to persistency.");

        var notificationManager = notifications(app, dataStores);

        setupMeetingReceiver(notificationManager);

        setupLocationReceiver(notificationManager);

        setupFrontendWeb(dataStores);

        setupMobileServices(dataStores);

        startWeb();
    });

    function setupMeetingReceiver(notificationManager)
    {
        emailClient(
            new imap(configuration.imap),
            emailHandler(function (error, method, meeting) {
                if (error)
                    log("A meeting wasn't handled. " + error.message);
                else {
                    log("Meeting received: " + inspect(meeting));
                    if (method === "request")
                        notificationManager.handleMeetingRequest(meeting);
                    else if (method === "cancel")
                        notificationManager.handleMeetingCancellation(meeting);
                    else {
                        log("Meeting had an invalid method: " + method);
                    }
                }}),
            true);
    }

    function setupFrontendWeb(dataStores)
    {
        app.get("/", routes.index);

        var meetingRoutes = routes.meeting(dataStores.meetings);
        app.all("/meeting/:id([0-9a-f]{24})", meetingRoutes.get);
        app.all("/REST/meeting/:id([0-9a-f]{24})/location", meetingRoutes.setLocation);
        app.all("/REST/meeting/:id([0-9a-f]{24})/track", meetingRoutes.setTracking);
    }

    function setupLocationReceiver(notificationManager)
    {
        app.all("/REST/location", locationHandler(function (error, location) {
            if (error)
                log("A location update failed. " + error);
            else {
                log("Location received: " + inspect(location));
                notificationManager.handleLocation(location);
            }
        }));
    }

    function setupMobileServices(dataStores)
    {
        var mobileRoutes = routes.mobile(dataStores.meetings);
        app.all("/REST/meetings/:email([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})", mobileRoutes.getMeetings);
        app.all("/REST/meeting/:id([0-9a-f]{24})/travel", mobileRoutes.setTravelPlan);
    }

    function startWeb()
    {
        var httpServer = http.createServer(app);
        httpServer.on("error", function (error) {
            console.log();
            if (error.code == "EADDRINUSE") {
                log("Couldn't start HTTP server: The port in use.");
            }
            else if (error.code == "EACCES") {
                log("Couldn't start HTTP server: Root privileges required to bind port. Try running with 'sudo'.")
            }
            else {
                log("Problem with HTTP server:");
                log(error);
            }
            process.exit(1);
        });

        httpServer.listen(app.get("port"), function () {
            log("Express server listening on port " + app.get("port"));
        });
    }
}
exports = module.exports = start;