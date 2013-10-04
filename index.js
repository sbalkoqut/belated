var app = require("./lib/app");

require('./lib/config')(function (configuration) {
    app(configuration);
});
