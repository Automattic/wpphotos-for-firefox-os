/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";

wp.views.SettingsSitePage = wp.views.Page.extend( {
	template_name: 'settings-site',
	
	events: _.extend( {
		'click button.back': 'goBack',
		'click button.save': 'save',
		'click button.cancel': 'goBack'
	} ),
	
	initialize: function( options ) {
		this.model = options.model;
		
		this.render();
	},
	
	render: function() {

		var template = wp.views.templates[this.template_name].text;
		this.$el.html( template );
		
		var username = this.model.get( 'username' );
		var password = this.model.get( 'password' );
		var dec = CryptoJS.AES.decrypt( password, username );
		password = dec.toString( CryptoJS.enc.Utf8 );
		
		this.el.querySelector( '#username' ).value = username;
		this.el.querySelector( '#password' ).value = password;
		this.el.querySelector( '#url' ).value = this.model.get( 'url' );
		this.el.querySelector( '#blog-name' ).innerHTML = this.model.get( 'blogName' );

		return this;
	},
	
	save: function( evt ) {
		evt.stopPropagation();

		var username = this.el.querySelector( '#username' ).value;
		var password = this.el.querySelector( '#password' ).value;

		// Validation
		if ( ! this.validateField( username ) || ! this.validateField( password ) ) {
			alert( _s( 'prompt-fill-out-all-fields' ) );
			return;
		}
				
		// encrypt password
		var enc = CryptoJS.AES.encrypt( password, username );
		var pass = enc.toString();

		this.model.set( {
			'username': username,
			'password': pass
		} );
		var self = this;
		var p = this.model.save();
		p.success( function() {
			if( self.model.id == wp.app.currentBlog.id ) {
				wp.api.setCurrentBlog( self.model.attributes );
			}

			self.goBack();
		} );
	},
	
	validateField: function( field ) {
		if ( field != '' ) {
			return true;
		}
		return false;
	}
	
} );
wp.views.registerTemplate( 'settings-site' );

