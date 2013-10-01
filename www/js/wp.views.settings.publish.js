/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";

wp.views.SettingsPublishPage = wp.views.Page.extend( {
	template_name: 'settings-publish-settings',
	
	publish_settings_options: [
		'label-always-ask',
		'label-publish-immediately',
		'label-publish-later'
	],
	
	initialize: function() {
		this.render();
	},

	events: _.extend( {
		'click button.back': 'goBack',
		'click li': 'updatePublishSetting'
	} ),
	
	render: function() {
		var template = wp.views.templates[this.template_name].text;
		this.$el.html( template );
		var className = '';
		var html = '';
		var pubSetting = localStorage.publishSetting || 0;
		var ul = this.el.querySelector( 'ul' );

		for ( var idx in this.publish_settings_options ) {
			className = '';
			if ( pubSetting === idx ) {
				className = 'selected';
			}
			html += '<li class="list-button ' + className + '" data-opt="' + idx + '">' + _s( this.publish_settings_options[idx] ) + '</li>';
		}
		
		ul.innerHTML = html; 
		
		return this;
	},
	
	updatePublishSetting: function( evt ) {
		evt.stopPropagation();
		
		var li = evt.target;
		var opt = li.getAttribute( 'data-opt' );
		localStorage.publishSetting = parseInt( opt, 10 );
		
		var lis = this.el.querySelectorAll( 'li' );
		for ( var i = 0; i < lis.length; i++ ) {
			$( lis[i] ).removeClass( 'selected' );
		}
		$( li ).addClass( 'selected' );
		wp.app.trigger( 'publishSettingsChanged' );
		
		this.goBack();
	}
	
} );
wp.views.registerTemplate( 'settings-publish-settings' );


