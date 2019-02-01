"use strict";

const libxmljs = require("libxmljs");
const methods = require("./methods");
const logger = require("./logger");

const NAMESPACES = {
  "soap-enc": "http://schemas.xmlsoap.org/soap/encoding/",
  "soap-env": "http://schemas.xmlsoap.org/soap/envelope/",
  "xsd": "http://www.w3.org/2001/XMLSchema",
  "xsi": "http://www.w3.org/2001/XMLSchema-instance",
  "cwmp": "urn:dslforum-org:cwmp-1-0"
};

let http = null;
let requestOptions = null;
let globalSettings = null;
let httpAgent = null;


function createSoapDocument(soapHeader) {
  let xml = libxmljs.Document();
  let env = xml.node("soap-env:Envelope");

  for (let prefix in NAMESPACES)
    env.defineNamespace(prefix, NAMESPACES[prefix]);

  let header = env.node("soap-env:Header");
  if (soapHeader) {
    soapHeader = "<body>"+soapHeader+"</body>";
    let parsedSoapHeader = libxmljs.parseXml(soapHeader);
    for (let head of parsedSoapHeader.get("/body").childNodes()) {
      header.addChild(head);
    }
  }

  let body = env.node("soap-env:Body");
  body._attr("SOAP-ENV:encodingStyle", "http://schemas.xmlsoap.org/soap/encoding/")

  return xml;
}


function sendRequest(xml, soapAction, callback) {
  let headers = {};
  let body = "";

  if (xml)
    body = xml.toString();

  headers["Content-Length"] = body.length;
  headers["Content-Type"] = "text/xml; charset=\"utf-8\"";

  if (soapAction) {
      headers["SOAPServer"] = "";
      headers["SOAPAction"] = soapAction;
  }

  if (globalSettings.cookie)
    headers["Cookie"] = globalSettings.cookie;

  let options = {
    method: "POST",
    headers: headers,
    agent: httpAgent
  };

  Object.assign(options, requestOptions);

  let request = http.request(options, function(response) {
    let chunks = [];
    let bytes = 0;

    response.on("data", function(chunk) {
      chunks.push(chunk);
      return bytes += chunk.length;
    });

    return response.on("end", function() {
      let offset = 0;
      body = new Buffer(bytes);

      chunks.forEach(function(chunk) {
        chunk.copy(body, offset, 0, chunk.length);
        return offset += chunk.length;
      });

      if (+response.headers["Content-Length"] > 0 || body.length > 0)
        xml = libxmljs.parseXml(body);
      else
        xml = null;

      if (response.headers["set-cookie"])
       globalSettings.cookie = response.headers["set-cookie"];

      return callback(xml);
    });
  });

  request.setTimeout(30000, function(err) {
    throw new Error("Socket timed out");
  });

  return request.end(body);
}


function request(entry, settings, finalCB) {
  requestOptions = require("url").parse(settings.url);
  http = require(requestOptions.protocol.slice(0, -1));
  httpAgent = new http.Agent({keepAlive: true, maxSockets: settings.parallel});
  globalSettings = settings;
  const xmlOut = createSoapDocument(settings.soapHeader);
  methods.GetParameterValues(settings, entry, xmlOut, function(res) {
    sendRequest(res, "cwmp:GetParameterValues", function(xml) {
      // Check if 404 or 403, hack fix
      if (xml.root().find("string(//title)").indexOf("403") >= 0 || xml.root().find("string(//title)").indexOf("404") >= 0) {
          console.error("Invalid URL".red);
          process.exit(1);
      }
      // Check if there is a CWMP error
      if (xml.root().find("string(//faultcode)").toString() !== "") {
        logger.warn(" - unreadable")
        logger.v(" [Fault Response] ".yellow +xml.root().find("string(//faultcode)").toString()+" - "+xml.root().find("string(//faultstring)").toString());
        logger.vv(xml.root().toString());
      } else {
        // Read response values
        logger.vv('\n'+xml.root().toString())
        var value = xml.root().find("string(//ParameterValueStruct/Value)").toString();
        if (value !== "") // We found a match!
          logger.logEntry(entry, value);
        else
          logger.warn(" - empty");
      }
      finalCB();
    });
  });
}


exports.request = request;
