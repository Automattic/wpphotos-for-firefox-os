/* 


*/

"use strict";

wp.views.EditorPage = wp.views.Page.extend( {
	template_name: 'editor',
	
	active_text_id: null,
	
	initialize: function() {
		this.render();
	},
	
	events: _.extend({
		'click button.save': 'save',
		'click button.back': 'goBack',
		'click label': 'showEditor',
		'click span': 'showEditor',
		'click button.cancel': 'hideEditor',
		'click button.done': 'updateText'
	} ),
	
	render:function() {
		var template = wp.views.templates[this.template_name].text;
		this.$el.html( template );

		var img = this.el.querySelector( '#photo' );
		try {
			if( typeof( MozActivity ) == 'undefined' ) {
				// Checking typeof(MozActivity) in a browser throws an exception in some versions of Firefox.
				// To handle everything in one place throw an error evenfor the versions that do not throw an exception.
				throw 'ignore';
			} else {
				img.src = URL.createObjectURL( wp.app.selected_image_blob ); // Saved from the posts view.
				wp.app.selected_image_blob = null; // discard.
			}
		} catch( ignore ) {
			// For browser testing prime with a local image.
			img.src = "img/start/1.jpg";
		}
		return this;
	},
	
	updateText: function() {
		this.hideEditor();
		
		var textarea = this.el.querySelector( '#editor' );
		var div = this.el.querySelector( '#' + this.active_text_id );
		div.innerHTML = textarea.value;
		textarea.value = '';
	},
	
	showEditor: function( evt ) {
		var btn;
		var target = ( evt.target.nodeName === 'label' ) ? evt.target : evt.target.parentNode;
		var header = this.el.querySelector( 'header' );
		header.innerHTML = target.querySelector( 'span' ).textContent;
		
		var div = target.querySelector( 'div' );
		this.active_text_id = div.id;
		
		var textarea = this.el.querySelector( '#editor' );
		textarea.value = div.innerHTML;
		
		$( textarea ).removeClass( 'hidden' );
		textarea.focus();
		
		btn = this.el.querySelector( '.back' );
		$( btn ).addClass( "hidden" );
		
		btn = this.el.querySelector( '.save' );
		$( btn ).addClass( 'hidden' );
		
		btn = this.el.querySelector( '.done' );
		$( btn ).removeClass( 'hidden' );

		btn = this.el.querySelector( '.cancel' );
		$( btn ).removeClass( 'hidden' );
		
	},
	
	hideEditor: function() {
		var btn;
		
		var header = this.el.querySelector( 'header' );
		var attr = header.getAttribute( 'data-l10n-id' );
		header.innerHTML = _s( attr );
		
		var textarea = this.el.querySelector( '#editor' );
		$( textarea ).addClass( 'hidden' );
		
		btn = this.el.querySelector( '.back' );
		$( btn ).removeClass( 'hidden' );
		
		btn = this.el.querySelector( '.save' );
		$( btn ).removeClass( 'hidden' );
		
		btn = this.el.querySelector( '.done' );
		$( btn ).addClass( 'hidden' );

		btn = this.el.querySelector( '.cancel' );
		$( btn ).addClass( 'hidden' );
		
	},
	
	goBack: function() {
		if( confirm( _s( 'prompt-discard-post?' ) ) ) {
			wp.nav.pop();
		}
	},
	
	save: function() {
		// Save a local draft or sync to the server?
		var publishSetting = parseInt( localStorage.publishSetting ) || 0;
		switch( publishSetting ) {
			case 0:
				this.prompt();
				break;
			case 1:
				this.upload();
				break;
			case 2:
				this.prepareToSave( false ); // Save local
				break;
		}
	},
	
	prompt: function(){
		if( confirm( _s( 'prompt-publish-now' ) ) ) {
			this.upload();
		} else {
			this.prepareToSave( false ); // Save local
		}
	},
	
	upload: function() {
		if( ! wp.app.isNetworkAvailable() ) {
			alert( _s( 'prompt-network-missing-saving-locally' ) );
			this.prepareToSave( false ); // Save local
		}
		
		this.prepareToSave( true ); // Upload and save
	},
	
	prepareToSave: function( upload_now ) {
		// There can be an apparent lag on some devices when getting the image data from a canvas.
		// We don't want the app to look unresponsive so show the loading indicator, 
		// give the DOM a chance to refresh, then get the image data.
		wp.app.showLoadingIndicator( _s( 'Formatting...' ) );
		
		var self = this;
		setTimeout( function() {
			self.performSave( upload_now );
			wp.app.hideLoadingIndicator();
		}, 100 );
	},

	performSave: function( upload_now ) {
		
		var img = this.el.querySelector( '#photo' );
		var caption = this.el.querySelector( '#caption' );
		var title = this.el.querySelector( '#post-title' );
		var content = this.el.querySelector( '#post-content' );
		var tags = this.el.querySelector( '#post-tags' );
		
		// Unagi device camera takes photos at 1200 x 1600.
		// Images size > 2mb so downsize for faster uploads and better performance.
		// TODO: Add a setting to let the user decide on image size.
		var maxWidth = ( img.naturalWidth < img.naturalHeight ) ? 600 : 800;
		var width = img.naturalWidth;
		var height = img.naturalHeight;
		
		if ( img.naturalWidth > maxWidth ) {
			var r = maxWidth / img.naturalWidth;
			width = maxWidth;
			height = height * r;
		}
		
		var canvas = this.el.querySelector( '#photo-canvas' );
		canvas.width = width;
		canvas.height = height;
		
		var ctx = canvas.getContext( '2d' );
		ctx.drawImage( img, 0, 0, width, height );
	
		var image_data = canvas.toDataURL( 'image/png', 0.80 );
		
		var attrs = {
			'blogkey': wp.app.currentBlog.id,
			'post_title': title.innerHTML.trim(),
			'post_content': content.innerHTML.trim()
		};

		if ( tags.innerHTML.trim().length > 0 ){
			attrs.terms_names = { 'post_tag': tags.innerHTML.trim().split( ',' ) };
		}
		
		var post = new wp.models.Post( attrs );
		
		var p;
		if( upload_now ) {
			p = post.uploadAndSave( image_data, caption.innerHTML.trim() ); // saves
		} else {
			post.setPendingPhoto( image_data, caption.innerHTML.trim() );
			p = post.save();
		}
		
		p.fail( function() {
			var result = p.result();
			var msg = _s( 'prompt-problem-publishing' );
			if ( result.status == 0 && result.readyState == 0 ) {
				msg = 'bad url';
			} else if( result.faultCode ){
				if ( result.faultCode == 403 ) {
					msg = _s( 'prompt-bad-username-password' );
				} else {
					msg = result.faultString;
				}
			}
			alert( _s( msg ) );
		});
		
		wp.app.posts.add( post, { 'at': 0 } );

		wp.nav.pop();
	}
	
});
wp.views.registerTemplate( 'editor' );
