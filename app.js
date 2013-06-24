
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
var config = require("./config.json");

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
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

app.all('/location', locationHandler(function(error, location)
{
    if (error)
        console.log("[LOCATION] An update failed. " + error);
    else
    {
        console.log("[LOCATION] received: " + inspect(location));
        notificationManager.handleLocation(location);
    }
}));


emailClient(
    new imap(config.imap),
    emailHandler(function (error, meeting) {
        if (error)
            console.log("A meeting was not added. " + error);
        else {
            console.log("Meeting received: " + inspect(meeting));
            notificationManager.handleMeeting(meeting);
        }
    }),
    true);

// Debug only.
notificationManager.handleMeeting({
    location: "Sydney, Australia",
    latitude: 1.92,
    longitude: 122.3,
    start: new Date(Date.now() + 15.03 * 60000),
    end: new Date(Date.now() + 45.03 * 60000),
    organiser: {
        name: "Patrick M",
        email: "patrick.meiring@live.com"
    },
    attendees: [{
        name: "Patrick Meiring",
        email: "patrick.meiring@gmail.com"
    }],
    subject: "Meeting Subject",
    description: "Meeting body.\nFurther description...",
    emailId: "<BLU401-EAS306CF3C721F073561649904888F0@phx.gbl>"
});
notificationManager.handleLocation({
    latitude: 1.9201,
    longitude: 122.3001,
    email: "patrick.meiring@gmail.com",
    lastUpdate: new Date(Date.now() - 60000)
});
notificationManager.handleLocation({
    latitude: 1.951,
    longitude: 122.249,
    email: "patrick.meiring@live.com",
    lastUpdate: new Date(Date.now() - 240000)
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
