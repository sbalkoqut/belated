var inspect = require("util").inspect;

function send(meeting, attendeeReports) {
    console.log(inspect(meeting, { depth: 4 }));
    console.log(inspect(attendeeReports, { depth: 4 }));
}

exports.send = send;