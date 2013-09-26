/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";

/*
	Convenience method for localizing strings in code. Pass the identifier of the sting in the localization files.
	Supports variables in strings. 
	For more info on webL10n localization see: https://github.com/fabi1cazenave/webL10n
	
	Usage:
		Assuming localization strings are defined as follows:
			welcome = Welcome!
			welcome-user = Welcome {{user}}!

		Then you can translate them like so: 
			_s('welcome');
			_s('welcome-user', { user: "John" });
*/
function _s( text ) {
	try {
		if ( navigator && navigator.mozL10n ) {
			return navigator.mozL10n.get.apply( null, arguments ) || text;
		};
	} catch( ignore ) {}
	return text;
}

if ( typeof wp === 'undefined' ) {
	var wp = {};
}

wp.views = {
	
	templates: {},
	
	registerTemplate: function( template_name, root ) {
		this.templates[template_name] = {};
	},
	
	loadTemplates: function() {
	
		var p = wp.promise();
		
		var xhrs = [];
		
		function isFinishedLoading() {
			for ( var idx in xhrs ) {
				var xhr = xhrs[idx];
				if ( ! xhr.result ) {
					return;
				}
			}
			p.resolve();
		}
		
		function getTemplate( key ) {
	 		var url = 'templates/' + key + '.html';
	 		
		 	var xhr = wp.XHR.get( { 'url': url } );
		 	xhr.success( function( res ) {

				var div = document.createElement( 'div' );
				div.innerHTML = res.response;
				
				// Translate locales.
				if ( navigator && navigator.mozL10n ) {
					navigator.mozL10n.translate( div );
				}
				
				var text = div.querySelector( '#template' ).innerHTML;
				wp.views.templates[key].text = text
				isFinishedLoading();
		 	} );
		 	xhr.fail( function( err ) {
			 	wp.log( err );
			 	
			 	isFinishedLoading();
		 	} );
			
			return xhr;
		}
		
		for ( var key in this.templates ) {
		 	xhrs.push( getTemplate( key ) );
	 	}
		
		return p;
	},
	
	normalizeUrl: function( url ) { 
		// make sure it has a protocol
		if(!(/^https?:\/\//i).test(url)) url = 'https://' + url;
		// add the /xmlrpc.php
		if ( ! ( /\/xmlrpc\.php$/i ).test( url ) ) {
			url = url + '/xmlrpc.php';
		}
		
		return url;
	}
};


wp.views.Page = Backbone.View.extend( {
	className: 'page',
	
	events: {
		'click button.back' : 'goBack'
	},
	
	goBack: function() {
		wp.nav.pop();
	}

} );
