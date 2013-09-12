
var serverOffset = new Date().getTimezoneOffset();
function toLocalTime(date)
{
    var localOffset = 600 + serverOffset; // The number of minutes that must be added to timestamps to get GMT+10 time
    localOffset = localOffset * 60 * 1000;

    var startDate = new Date(meeting.start.getTime() + brisbaneOffset);
}

function sameDay(a, b) {
    var firstDate = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    var secondDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());

    return (firstDate.getTime() == secondDate.getTime());
}