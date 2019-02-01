# CWMPwn
Leveraging CWMP (CPE WAN Management Protocol) to extract vendor specific secrets and configurations.

## What are TR-069 and CWMP?
[TR-069](https://en.wikipedia.org/wiki/TR-069) (*Technical Report 069*) is a technical specification of the [Broadband Forum](broadband-forum.org) that defines an application layer protocol for remote management of [customer-premises equipment](https://en.wikipedia.org/wiki/Customer-premises_equipment) (CPE) connected to an Internet Protocol (IP) network.
The *CPE WAN Management Protocol* (CWMP) defines support functions for auto-configuration, software or firmware image management, software module management, status and performance managements, and diagnostics.

## Examples
#### Hardcoded ftp credentials discovery
![](https://i.imgur.com/IP7zBXd.png)
#### Users and passwords enumeration
![](https://i.imgur.com/B0swulN.png)

## Usage
> *Note: The Broadband Forum defines several data models for use with the CPE WAN Management Protocol ([TR-069 Amendment 6](https://www.broadband-forum.org/technical/download/TR-069_Amendment-6.pdf)). These data models contain objects and parameters that describe the many different functions and capabilities available to devices and services that are manageable via CWMP.*

You will first need to find out which data model is used by your target CPE. You may download a specific XML file describing your CPE's data model from the [official Broadband Forum page](https://cwmp-data-models.broadband-forum.org/#Latest%20Data%20Models). CWMPwn will process it natively (using the `-x` flag), but if you can't get it to work out of the box please file an [issue](https://github.com/phosphore/CWMPwn/issues).
By default CWMPwn uses TR-098. 

#### Options
```
  -V, --version                     output the version number
  -u, --url [url]                   CPE URL to query (default: "http://192.168.1.1/data_model.cgi")
  -x, --xml [path]                  Data model XML taken from the original broadband forum definition, see https://goo.gl/T73kMT (default: "./DataModels/xml/tr-098-1-8-0-full.xml")
  -l, --list [path]                 Custom data model parameters list, see https://goo.gl/eM3Hnp (default: "./DataModels/csv/TR-098.csv")
  -c, --cookie [cookievalue]        Valid HTTP cookies to query the target with privileges (default: false)
  -sh, --soap-header [soap-header]  Additional SOAP headers to include (default: false)
  -r, --range [max]                 How much should CWMPwn enumerate objects for each "table" (default: 3) (default: 3)
  -p, --parallel [limit]            How many requests should be run in parallel (default: 3) (default: 3)
  -v, --verbosity [level]           Set verbosity level (default: 0)
  -h, --help                        output usage information
```

#### Example of usage
In most cases you will need to tune the default options for your target CPE. You will probably need to specify a cookie (`--cookie`) and some specific SOAP headers (`--soap-header`).
To debug these, you can also set the verbosity with `-v 2` to output each CPE response. E.g. :
```
$ node CWMPwn.js --cookie "wbm_cookie_session_id=21FA071A64304119CD2D34B0454AF68D;" --soap-header "<DMCookie>59569BCD7C06074CC881AB7AF340EE52</DMCookie><SessionNotRefresh>1</SessionNotRefresh>"
```

## Vendor-Specific Parameters
A vendor may extend the standardized parameter list with vendor-specific parameters and objects. The name of a vendor-specific parameter or object always have the form: `X_<VENDOR>_VendorSpecificName`. `<VENDOR>` is a unique vendor identifier, which may be either an OUI or a domain name. An OUI is an organizationally unique identifier which is formatted as a six-hexadecimal-digit string using all upper-case letters and including any leading zeros.
A domain name is upper case with each dot (“.”) replaced with a hyphen or underscore.
Below are some example vendor-specific parameter and object names:
```
InternetGatewayDevice.UserInterface.X_00D09E_AdBanner
InternetGatewayDevice.LANDevice.1.X_00D09E_LANInfraredInterfaceConfig.2.Status
X_GAMECO-COM_GameDevice.Info.Type
```
It is possible to provide CWMPwn with a custom list using `-l <csvPath>`. 

## TODO
- Implement the `GetParameterNames` action. [Example of this action envelope](https://github.com/ibnHatab/cwmp/blob/master/test/data/GetParameterNames.xml).
- Implement a fuzzer mode for the protocol

## License
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)
