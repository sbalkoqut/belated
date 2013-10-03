
var serverOffset = new Date().getTimezoneOffset();
function toLocalTime(date)
{
    var localOffset = 600 + serverOffset; // The number of minutes that must be added to timestamps to get GMT+10 time
    localOffset = localOffset * 60 * 1000;

    var result = new Date(date.getTime() + localOffset);
    return result;
}

function sameDay(a, b) {
    var firstDate = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    var secondDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());

    return (firstDate.getTime() == secondDate.getTime());
}

exports.isSameDay = sameDay;
exports.toLocalTime = toLocalTime;