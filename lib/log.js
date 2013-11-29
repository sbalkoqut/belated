var colog = require("colog");
function create(source) {
    function info(text) {
        colog.info("[" + source.toUpperCase() + "] " + text);
    }
    function warn(text) {
        colog.warning("[" + source.toUpperCase() + "] " + text);
    }
    function error(text) {
        colog.error("[" + source.toUpperCase() + "] " + text);
    }
    function verbose(text) {
        colog.log("[" + source.toUpperCase() + "] " + text);
    }
    function log(text) {
        colog.log("[" + source.toUpperCase() + "] " + text);
    }
    log.verbose = verbose;
    log.info = info;
    log.warn = warn;
    log.error = error;
    return log;
}
exports = module.exports = create;