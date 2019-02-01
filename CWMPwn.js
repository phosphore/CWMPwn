#!/usr/bin/env node
"use strict";
const async = require("async");
const libxmljs = require("libxmljs");
const csv = require("fast-csv");
const combinatorics = require('js-combinatorics');
const fs = require("fs");

const pkg = require("./package.json");
const client = require("./client");
const logger = require("./logger");

const defaults = { "xml": "./DataModels/xml/tr-098-1-8-0-full.xml",
					"csv": "./DataModels/csv/TR-098.csv"};
const listParsingOptions = { "ignoreEmpty": true, "trim": true };					

const program = require("commander")
  .version(pkg.version)
  .description(pkg.description)
  .option("-u, --url [url]", "CPE URL to query", "http://192.168.1.1/data_model.cgi")
  .option("-x, --xml [path]", "Data model XML taken from the original broadband forum definition, see https://goo.gl/T73kMT", defaults.xml)
  .option("-l, --list [path]", "Custom data model parameters list, see https://goo.gl/eM3Hnp", defaults.csv)
  .option("-c, --cookie [cookievalue]", "Valid HTTP cookies to query the target with privileges", false)
  .option("-sh, --soap-header [soap-header]", "Additional SOAP headers to include", false)
  .option("-r, --range [max]", "How much should CWMPwn enumerate objects for each \"table\" (default: 3)", 3)
  .option("-p, --parallel [limit]", "How many requests should be run in parallel (default: 3)", 3)
  .option("-v, --verbosity [level]", "Set verbosity level", 0)
  .parse(process.argv);

logger.init(program.verbosity);
const targetUrl = program.url;
const targetCookie = program.cookie;
const counterTotal = 0;
var counterCurrent = 0;

if (!/^(http|https):\/\//.test(program.url)) {
  console.error("Invalid URL".red);
  process.exit(1);
}

if (program.parallel === 0) {
  console.error("Specify a number > 0".red);
  process.exit(1);
}

var requestsQ = async.queue(function(task, callback) {
    logger._log('Processing: ' + task.name.green);
    client.request(task.name, program, function() {
    	callback();
    })
}, program.parallel);

requestsQ.drain = function() {
    logger.v('All items have been processed');
    console.log();
};

function format(str, obj) {
    return str.replace(/\{\s*([^}\s]+)\s*\}/g, function(m, p1, offset, string) {
        return obj[p1]
    })
}

function unfold(string) {
	var levels = (string.match(/\{i\}/g) || []).length;
	var rangedArray = [program.range];

	for (var i = 0; i <= program.range; i++)
		rangedArray[i] = i.toString();
	
	var baseN = combinatorics.baseN(rangedArray, levels).toArray();
	for (var i = 0; i < baseN.length; i++) {
	   var tmp = string;
		for (var j = 0; j < levels; j++) {
			tmp = tmp.replace("{i}",baseN[i][j])
			if (j === levels-1) 
				requestsQ.push({name: tmp});
		}
	}
}

function start() {
	if ((program.xml === defaults.xml && program.list === defaults.csv) || 
		(program.xml !== defaults.xml)) {
		var content = fs.readFileSync(program.xml, 'utf8');
		var xmlDoc = libxmljs.parseXml(content);
		var objArray = xmlDoc.find("//parameter[@name]");
		for (var a in objArray) {
			var entry = objArray[a].parent().attr("name").value() + objArray[a].attr("name").value();
			if (entry.indexOf("{i}") > -1)
		 		unfold(entry);
		 	else
		    	requestsQ.push({name: entry});
		}
	} else if (program.list !== defaults.csv) {
		csv
		 .fromPath(program.list, listParsingOptions)
		 .on("data", function(entry){
		 	if (entry.toString().indexOf("{i}") > -1)
		 		unfold(entry.toString());
		 	else
		    	requestsQ.push({name: entry.toString()});
		 });
	}
}

start();