function logAction() {
    return logSymbol.apply(null, ["*"].concat(Array.prototype.slice.call(arguments)));
}

function logError() {
    return logSymbol.apply(null, ["!"].concat(Array.prototype.slice.call(arguments)));   
}

function logSymbol(symbol, line) {
    return log.apply(null, [`[${symbol}] ` + line].concat(Array.prototype.slice.call(arguments, 2)));
}

function log() {
    return console.log.apply(console, arguments);
}

function fail(error, code = 1) {
    logError(`Error: ${error.message}`);
    process.exit(code);
}

function indent(lines, count = 1, str = "    ", bullet) {
    let pad = "";
    for(var i = 0; i < count; i++) pad += str;
    if(bullet) pad += bullet;
    return pad + lines.split("\n").join("\n" + pad);
}

module.exports = {
    logAction,
    log,
    fail,
    indent
};