/*
	wp.XHR
	Makes an XMLHttpRequest.
	
	ctor options
		url: The url for the xhr request.
		data: Data to send with a post request.
		format: The expected resonse format.
		httpMethod: GET or POST
		
	Usage:
		var req = new wp.XHR(Options);
		req.success(Function)
			.fail(Function)
			.always(Function);
		req.execute();
*/
"use strict";

if(typeof(wp) == "undefined") { var wp = {} };

wp.XHR = function(options) {
	var options = options || {};

	this.xhr 	= null;
	this.result = null;
	this.url 	= options["url"] || null;
	this.data 	= options["data"] || null;
	this.format = options["format"] || null;
	this.httpMethod = options["httpMethod"] || "GET";
	this.headers = options["headers"] || false;

	this._callbacks = {
		success:[],
		fail:[],
		always:[],
		progress:[]
	};
};


wp.XHR.get = function(options) {
	var req = new wp.XHR(options);
	req.httpMethod = "GET";
	req.execute();
	return req;
};


wp.XHR.post = function(options) {
	var req = new wp.XHR(options);
	req.httpMethod = "POST";
	req.execute();
	return req;
};


// Add a callback for success.
wp.XHR.prototype.success = function(f) {
	this._callbacks.success.push(f);
	return this;
};


// Add a callback for failure.
wp.XHR.prototype.fail = function(f) {
	this._callbacks.fail.push(f);
	return this;
};


// Add a callback that will always trigger in the event of success or failure.
wp.XHR.prototype.always = function(f) {
	this._callbacks.always.push(f);
	return this;
};


wp.XHR.prototype.progress = function(f) {
	this._callbacks.progress.push(f);
	return this;
};


wp.XHR.prototype.clean = function() {
	this._callbacks.success = [];
	this._callbacks.fail = [];
	this._callbacks.always = [];
};


wp.XHR.prototype.abort = function() {
	if (this.xhr.status > 0 && this.xhr.status < 4) {
		this.xhr.abort();
	};
};

wp.XHR.prototype.status = function() {
	return this.xhr.status;	
};

wp.XHR.prototype.execute = function(headers) {
	"use strict";
	var self = this;	
	var xhr = new XMLHttpRequest({mozSystem: true});
	
	this.xhr = xhr;
	
	var docallbacks = function(event, arr) {
		for (var i = 0; i < arr.length; i++) {
			try {
				arr[i](self.xhr, event);
			} catch(ignore){
				console.log(ignore);
			};
		};
	};

	try {
		xhr.open(this.httpMethod, this.url, true);
	} catch(e) {
		docallbacks(e, this._callbacks.fail);
		return;
	};
	
	if(this.headers) {
		for(var key in this.headers) {
			xhr.setRequestHeader(key, this.headers[key]);
		};
	};
	
	if(this.format) {
		xhr.responseType = this.format;
	};
	
	
	xhr.addEventListener("progress", function(event){
		docallbacks(event, self._callbacks.progress);
	}, false);
	
	
	xhr.onabort = function(event) {
		// TODO: Do we need to call always?
		// TODO: ?
		self.clean();
	};
	
	xhr.onloadstart = function(event) {
		// TODO: ?
	};
	
	xhr.onload = function(event) {
		self.result = self.xhr.response;
		docallbacks(event, self._callbacks.success);
	};
	
	xhr.onloadend = function(event) {
		docallbacks(event, self._callbacks.always);
		self.clean();
	};
	
	xhr.onerror = function(event) {
		// TODO: Listeners?
		docallbacks(event, self._callbacks.fail);
	};
	
	xhr.ontimeout = function(event) {
		// TODO: Support?
	};
	
	xhr.onreadystatechange = function(event) {
		// TODO: Support?		
	};
	
	// Don't send empty strings.
	xhr.send(this.data ? this.data : null);
	
	return this;
};
