
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
  , inspect = require('util').inspect;

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

var emailHandler = emailHandler.initialise(function (error, meeting) {
    if (error)
        console.log("A meeting was not added. " + error);
    else {
        console.log("Meeting received: " + inspect(meeting));
    }
});
emailClient.listen(
    new imap({
        user: 'calqut@gmail.com',
        password: '@wO9%gqk>&S',
        host: 'imap.gmail.com',
        port: 993,
        secure: true
    }),
    emailHandler,
    true);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
