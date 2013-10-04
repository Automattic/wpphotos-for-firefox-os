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

if( typeof wp === 'undefined' ) {
	var wp = {};
}

wp.XHR = function( options ) {
	options = options || {};

	this.xhr	= null;
	this.result = null;
	this.url	= options.url || null;
	this.data	= options.data || null;
	this.format = options.format || null;
	this.httpMethod = options.httpMethod || "GET";
	this.headers = options.headers || false;

	this._callbacks = {
		'success': [],
		'fail': [],
		'always': [],
		'progress': []
	};
};


wp.XHR.get = function( options ) {
	var req = new wp.XHR( options );
	req.httpMethod = 'GET';
	req.execute();
	return req;
};


wp.XHR.post = function( options ) {
	var req = new wp.XHR( options );
	req.httpMethod = 'POST';
	req.execute();
	return req;
};

wp.XHR.prototype.docallbacks = function( event, arr ) {
	for ( var i = 0; i < arr.length; i++ ) {
		try {
			arr[i]( this.xhr, event );
		} catch( ignore ){
			wp.log( ignore );
		}
	}
};

// Add a callback for success.
wp.XHR.prototype.success = function( f ) {
	this._callbacks.success.push( f );
	return this;
};


// Add a callback for failure.
wp.XHR.prototype.fail = function( f ) {
	this._callbacks.fail.push( f );
	return this;
};


// Add a callback that will always trigger in the event of success or failure.
wp.XHR.prototype.always = function( f ) {
	this._callbacks.always.push( f );
	return this;
};


wp.XHR.prototype.progress = function( f ) {
	this._callbacks.progress.push( f );
	return this;
};


wp.XHR.prototype.clean = function() {
	this._callbacks.success = [];
	this._callbacks.fail = [];
	this._callbacks.always = [];
};


wp.XHR.prototype.abort = function() {
	if ( this.xhr.status > 0 && this.xhr.status < 4 ) {
		this.xhr.abort();
	}
};

wp.XHR.prototype.status = function() {
	return this.xhr.status;
};

wp.XHR.prototype.onProgress = function( event ) {
	this.docallbacks( event, this._callbacks.progress )
};

wp.XHR.prototype.onAbort = function( event ) {
	this.clean();
};

wp.XHR.prototype.onLoadStart = function( event ) {
	wp.log( 'xhr.onloadStart' );
};

wp.XHR.prototype.onLoad = function( event ) {
	this.result = this.xhr.response;
	this.docallbacks( event, this._callbacks.success );
};

wp.XHR.prototype.onLoadEnd = function( event ) {
	this.docallbacks( event, this._callbacks.always );
	this.clean();
};

wp.XHR.prototype.onFail = function( event ) {
	// TODO: Listeners?
	this.docallbacks( event, this._callbacks.fail );
};

wp.XHR.prototype.onReadyStateChange = function( event ) {
	wp.log( 'xhr.readyState', this.xhr.readyState );
};

wp.XHR.prototype.execute = function( headers ) {
	var xhr = new XMLHttpRequest( { 'mozSystem': true } );
	
	this.xhr = xhr;
	
	var docallbacks = this.docallbacks.bind( this );

	try {
		xhr.open( this.httpMethod, this.url, true );
	} catch( e ) {
		docallbacks( e, this._callbacks.fail );
		return;
	}
	
	if( this.headers ) {
		for( var key in this.headers ) {
			xhr.setRequestHeader( key, this.headers[key] );
		}
	}
	
	if( this.format ) {
		xhr.responseType = this.format;
	}

	// Attach bound event handlers.
	var onProgress = this.onProgress.bind( this );
	xhr.addEventListener( 'progress', onProgress, false);

	xhr.onreadystatechange = this.onReadyStateChange.bind( this );	
	xhr.onabort = this.onAbort.bind( this );
	xhr.onloadstart = this.onLoadStart;
	xhr.onload = this.onLoad.bind( this );
	xhr.onloadend = this.onLoadEnd.bind( this );

	var onFail = this.onFail.bind( this );
	xhr.onerror = onFail;
	xhr.ontimeout = onFail;

	// Don't send empty strings.
	xhr.send( this.data ? this.data : null );
	
	return this;
};
