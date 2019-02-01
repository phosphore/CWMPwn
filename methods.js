"use strict";

const http = require("http");
const https = require("https");


const NAMESPACES = {
  "soap-enc": "http://schemas.xmlsoap.org/soap/encoding/",
  "soap-env": "http://schemas.xmlsoap.org/soap/envelope/",
  "xsd": "http://www.w3.org/2001/XMLSchema",
  "xsi": "http://www.w3.org/2001/XMLSchema-instance",
  "cwmp": "urn:dslforum-org:cwmp-1-0"
};

const INFORM_PARAMS = [
  "Device.DeviceInfo.SpecVersion",
  "InternetGatewayDevice.DeviceInfo.SpecVersion",
  "Device.DeviceInfo.HardwareVersion",
  "InternetGatewayDevice.DeviceInfo.HardwareVersion",
  "Device.DeviceInfo.SoftwareVersion",
  "InternetGatewayDevice.DeviceInfo.SoftwareVersion",
  "Device.DeviceInfo.ProvisioningCode",
  "InternetGatewayDevice.DeviceInfo.ProvisioningCode",
  "Device.ManagementServer.ParameterKey",
  "InternetGatewayDevice.ManagementServer.ParameterKey",
  "Device.ManagementServer.ConnectionRequestURL",
  "InternetGatewayDevice.ManagementServer.ConnectionRequestURL",
  "Device.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress",
  "Device.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress"
];



const pending = [];

function getPending() {
  return pending.shift();
}


function getSortedPaths(device) {
  if (!device._sortedPaths)
    device._sortedPaths = Object.keys(device).filter(p => p[0] !== "_").sort();
  return device._sortedPaths;
}


function GetParameterNames(device, xmlIn, xmlOut, callback) {
  let parameterNames = getSortedPaths(device);
  let parameterPath = xmlIn.get("/soap-env:Envelope/soap-env:Body/cwmp:GetParameterNames/ParameterPath", NAMESPACES).text();
  let nextLevel = Boolean(JSON.parse(xmlIn.get("/soap-env:Envelope/soap-env:Body/cwmp:GetParameterNames/NextLevel", NAMESPACES).text()));
  let parameterList = [];

  if (nextLevel) {
    for (let p of parameterNames) {
      if (p.startsWith(parameterPath) && p.length > parameterPath.length + 1) {
        let i = p.indexOf(".", parameterPath.length + 1);
        if (i === -1 || i === p.length - 1)
          parameterList.push(p);
      }
    }
  } else {
    for (let p of parameterNames) {
      if (p.startsWith(parameterPath))
        parameterList.push(p);
    }
  }

  let getParameterNamesResponseNode = xmlOut.root().childNodes()[1]
    .node("cwmp:GetParameterNamesResponse");
  let parameterListNode = getParameterNamesResponseNode.node("ParameterList");

  parameterListNode.attr({
    "soap-enc:arrayType": `cwmp:ParameterInfoStruct[${parameterList.length}]`
  });

  for (let p of parameterList) {
    let parameterInfoStructNode = parameterListNode.node("ParameterInfoStruct");
    parameterInfoStructNode.node("Name", p);
    parameterInfoStructNode.node("Writable", String(device[p][0]));
  }

  return callback(xmlOut);
}


function GetParameterValues(settings, entry, xmlOut, callback) {
  let body = xmlOut.root().childNodes()[1];
  //let parameterNames = xmlIn.find("/soap-env:Envelope/soap-env:Body/cwmp:GetParameterValues/ParameterNames/*", NAMESPACES);
  let parameterList = xmlOut.root().childNodes()[1].node("cwmp:GetParameterValues").node("ParameterNames").node("string").text(entry);

  // parameterList.attr({
  //   "SOAP-ENC:arrayType": "cwmp:ParameterValueStruct[" + parameterNames.length + "]"
  // });

  // for (let p of parameterNames) {
  //   let name = p.text();
  //   let valueStruct = parameterList.node("ParameterValueStruct");
  //   valueStruct.node("Name", name);
    // valueStruct.node("Value", device[name][1]).attr({
    //   "xsi:type": type
    // });
  //}

  return callback(xmlOut);
}



function inform(settings, xmlOut, callback) {
  let body = xmlOut.root().childNodes()[1];
  let inform = body.node("cwmp:Inform");
  let deviceId = inform.node("DeviceId");

  let eventStruct = inform.node("Event").attr({
    "soap-enc:arrayType": "cwmp:EventStruct[1]"
  }).node("EventStruct");

  eventStruct.node("EventCode", "2 PERIODIC");
  eventStruct.node("CommandKey");

  inform.node("MaxEnvelopes", "1");
  inform.node("CurrentTime", new Date().toISOString());
  inform.node("RetryCount", "0");

  let parameterList = inform.node("ParameterList").attr({
    "soap-enc:arrayType": "cwmp:ParameterValueStruct[7]"
  });

  // for (let p of INFORM_PARAMS) {
  //   let param = device[p];
  //   if (!param)
  //     continue;

  //   let parameterValueStruct = parameterList.node("ParameterValueStruct");
  //   parameterValueStruct.node("Name", p);
  //   parameterValueStruct.node("Value", param[1]).attr({"xsi:type": param[2]});
  // }

  return callback(xmlOut);
}


exports.inform = inform;
exports.getPending = getPending;
exports.GetParameterNames = GetParameterNames;
exports.GetParameterValues = GetParameterValues;
