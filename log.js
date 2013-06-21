
function create(source) {
    function log(text) {
        console.log("[" + source.toUpperCase() + "] " + text);
    }
    return log;
}

exports = module.exports = create;