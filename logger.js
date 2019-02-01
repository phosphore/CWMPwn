const colors = require('colors');

var verbosityLevel = 0;

function v(string) {
	if (verbosityLevel == 1) {
		 console.log(string.grey)
	} 
}

function vv(string) {
	if (verbosityLevel == 2) {
		 console.log(string.grey)
	} 
}

function warn(string) {
	if (verbosityLevel != 0)
		console.log(string.yellow)
}

function warn(string) {
	if (verbosityLevel != 0)
		console.log(string.yellow)
}

function log(string) {
	console.log(" " + string)
}

function logEntry(entry, result) {
	var prettyEntry = "["+entry+"]";
	console.log(prettyEntry.green + ": " + result.blue);
}

function _log(string) {
	if (verbosityLevel != 0)
		process.stdout.write(string)
}

function init(verbosity) {
	verbosityLevel = verbosity;
}

exports.init = init;
exports.v = v;
exports.vv = vv;
exports.warn = warn;
exports.log = log;
exports._log = _log;
exports.logEntry = logEntry;
