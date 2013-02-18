/*
	wp.XMLRPC
	Makes an XMLRPC Request.
	Based on the XML-RPC libraries at 
		https://github.com/daniloercoli/JS-XML-RPC-lib-for-WordPress/blob/master/xmlrpc-client.js
		http://webos.trac.wordpress.org/browser/trunk/wordpress.application/source/XMLRPCService.js
	
	Requires: wp.XHR
	
	ctor options
		Options for XHR.
		params: An array of parameters for the xmlrpc call.
		xmlrpcMethod: The method name of the xmlrpc call.
		
	Usage:
		var rpc = new wp.XMLRPC(Options);
		rpc.success(Function)
			.fail(Function)
			.always(Function);
		rpc.execute();
	
*/
"use strict";

if(typeof(wp) == "undefined") { var wp = {} };

wp.XMLRPC = function(options) {
	var self = this;
	var options = options || {};
	options.headers  = options.headers || {};
	options.headers["Content-Type"] = "text/xml";
	
	this.result = null;
	this.fault = false;	
	this.params = options["params"] || [];
	this.xmlrpcMethod = options["xmlrpcMethod"] || null;

	this.xhr = new wp.XHR(options);
	
	this.xhr.success(function(){
		self.parseResponseXML();
	});	
};

wp.XMLRPC.Base64 = function(value, encode) {
	if (encode) {
		value = btoa(value);
	};
	this.value = value;
};

// Add a callback for success.
wp.XMLRPC.prototype.success = function(f) {
	this.xhr.success(f);
	return this;
};


// Add a callback for failure.
wp.XMLRPC.prototype.fail = function(f){
	this.xhr.fail(f);
	return this;
};


// Add a callback that will always trigger in the event of success or failure.
wp.XMLRPC.prototype.always = function(f) {
	this.xhr.always(f);
	return this;
};


// Add a callback that will trigger on a progress event
wp.XMLRPC.prototype.progress = function(f) {
	this.xhr.progress(f);
	return this;
};


// Execute the request.
wp.XMLRPC.prototype.execute = function() {
	var req_body = this.formatRequestBody();
	console.log("XMLRPC.execute: Request body length", req_body.length);
	this.xhr.data = req_body;
	this.xhr.httpMethod = "POST";
	this.xhr.execute();
};


wp.XMLRPC.prototype.addParam = function(obj) {
	this.params.push(obj);
};


wp.XMLRPC.prototype.formatRequestBody = function() {
	var str = "";
	for (var i = 0; i < this.params.length; i++) {
    	str += "<param><value>" + this.formatParam(this.params[i]) + "</value></param>\n";
    };

	var xml = "<?xml version=\"1.0\"?>\n" +
    "<methodCall>\n<methodName>" + this.xmlrpcMethod + "</methodName>\n" +
    "<params>\n" + str + "</params>\n</methodCall>";
    return xml;
};


wp.XMLRPC.prototype.formatParam = function(param){
	if (param == null) param = "";
	
	// Arrays
	if (param instanceof Array) {
		var arr = "<array>\n<data>\n";
		for (var i = 0; i < param.length; i++) {
			if(null == param[i]) continue;
			arr += "<value>" + this.formatParam(param[i]) + "</value>\n";
		};
		arr += "</data>\n</array>\n";
		return arr;
	};
	
	// Numbers
	if (typeof(param) == "number" || param instanceof Number) {
		if (Math.round(param) == param) {
			return "<i4>" + param + "</i4>\n"
		} else {
			return "<double>" + param + "</double>\n"
		};
	};
	
	// Dates
	if (param instanceof Date || param.__proto__ instanceof Date || param.__proto__.constructor.name == 'Date') {
		var d = param.toISOString();
		d = d.split("-").join("");
		return "<dateTime.iso8601>" + d + "</dateTime.iso8601>\n";
	};
	
	// String
	if (typeof(param) == "string") {
		return "<string><![CDATA[" + param + "]]></string>\n";
	};
	
	if (param instanceof wp.XMLRPC.Base64) {
		return "<base64>" + param.value + "</base64>";	
	};
	
	// Functions
	if (param instanceof Function) {
		return this.formatParam(param());
	};

	// Structs
	var struct = "<struct>\n";
	for (var key in param) {
		struct += "<member>\n<name>" + key + "</name>\n";
		struct += "<value>" + this.formatParam(param[key]) + "</value>\n</member>\n";
	};
	struct += "</struct>";
	return struct;
};


wp.XMLRPC.prototype.parseResponseXML = function() {
	var str = this.xhr.result;
	try {
	// clean response document
	str = wp.XMLRPC.cleanDocument(str);
	
	// clean the BOM

	str = wp.XMLRPC.cleanBOM(str);
	} catch(e) {
		console.log(e);
	}
	// protect strings
	// wrap the strings in <![CDATA[ ]]>
	// We are treating all string values as potentially malformed XML. The parser will not attempt to process any of the
	// potentially dangerous copy
	str = str.replace(/<string>([\s]+<\!\[CDATA\[)?/gi, "<string><![CDATA[").replace(/<\/string>/gi, "]]></string>");

	// Convert to a DOM object
	var doc = new DOMParser().parseFromString(str, 'text/xml');

	// Check for faults
	if(this.hasFaults(doc)){
		return;
	};
	
	// No faults, get the result
	var val = doc.querySelector("methodResponse params param value *");
	this.result = this.parseNode(val);
};


wp.XMLRPC.prototype.hasFaults = function(doc) {
	var faultnode = doc.querySelector("methodResponse fault value *");
	if (faultnode) {
		this.fault = true;
		this.result = this.parseNode(faultnode);
		return true;
	};

	//checks for DOM fault
	/*
	 * <methodresponse>​
	<parsererror style=​"display:​ block;​ white-space:​ pre;​ border:​ 2px solid #c77;​ padding:​ 0 1em 0 1em;​ margin:​ 1em;​ background-color:​ #fdd;​ color:​ black">​
	<h3>​This page contains the following errors:​</h3>​
	<div style=​"font-family:​monospace;​font-size:​12px">​
	"error on line 218 at column 59: Input is not proper UTF-8, indicate encoding !
	Bytes: 0x1B 0x5B 0x20 0xC2
	"
	</div>​
	<h3>​Below is a rendering of the page up to the first error.​</h3>​
	</parsererror>​
	<params>​…​</params>​*/
	faultnode = doc.getElementsByTagName("parsererror")[0];
	if(faultnode) {
		this.fault = true;
		this.result = {"faultCode":32700,"faultString":"Parse Error, not well formed"};
		return true;
	};
	
	return false;
};


wp.XMLRPC.cleanDocument = function(str) {
	var pairs = [
		['methodResponse', 'params'],
		['params', 'param'],
		['param', 'value'],
		['array', 'data'],
		['struct', 'member']
	];

	var values = ['array','string', 'i4', 'int', 'dateTime\\.iso8601', 'double', 'struct'];
	pairs.push(['value', values.join("|")]);
  
	var pair, reg, open;  
	for (var i = 0; i < pairs.length; i++) {
		pair = pairs[i];
		open = new RegExp("<" + pair[0] + ">.*?<(" + pair[1] + ")>",'gmi');
		str = str.replace(open,"<"+pair[0]+"><$1>");
	};
  
	return str.replace(/>\n[\s]+\n</g, '><');
};


// Removes all characters before the opening XLM declaration
wp.XMLRPC.cleanBOM = function(str) {
	var leading_removed = str.substring(str.indexOf("<"));
	return leading_removed.replace(/^[^<]{0,}<\?xml([^>]+)>[^<]+<methodResponse/, "<?xml version=\"1.0\" ?>\n<methodResponse");
};


wp.XMLRPC.prototype.parseNode = function(node) {

	switch(node.nodeName) {

		case 'array':
			var data = node.firstChild;
			var children = data.children;
			var array = [];
			for (var i=0; i < children.length; i++) {
				var child = children[i].firstChild;
				array.push(this.parseNode(child));
			};
			return array;
			break;
			    
		case 'struct':
			var struct = {};
			var children = node.children;
			for (var i = 0; i < children.length; i++) {
				var name = children[i].querySelector("name");
				var value = children[i].querySelector("value").firstChild;
				struct[name.firstChild.nodeValue] = this.parseNode(value);
			};
			return struct;
			break;
      
		case 'string':
			var s = node.firstChild ? node.firstChild.nodeValue : '';
			s = s.replace(/&amp;([a-z]+|\#[\d]+);/ig, '&$1;').replace(/&gt;/gi,'>').replace(/&lt;/gi,'<').replace(/&quot;/gi,'"');
			return s.split('&#039;').join("'");
			break;
      
		case 'boolean':
			return node.firstChild ? node.firstChild.nodeValue == "1" : false;
			break;
		
		case 'i4':
		case 'int':
		case 'double':
			return node.firstChild ? parseInt(node.firstChild.nodeValue) : null;
			break;
      
		case 'dateTime.iso8601':
			var iso = node.firstChild.nodeValue;
			if(iso.indexOf("-") == -1) {
				iso = iso.slice(0, 6) + "-" + iso.slice(6);
				iso = iso.slice(0, 4) + "-" + iso.slice(4);
			}
			return node.firstChild ? new Date(iso) : null;
			break;
      
		default:
			throw("Don't know how to parse node: " + node.nodeName);
			break;
    };

};

