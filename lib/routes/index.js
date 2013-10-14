var meeting = require("./meeting");
var mobile = require("./mobile");
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Belated' });
};

exports.meeting = meeting;
exports.mobile = mobile;