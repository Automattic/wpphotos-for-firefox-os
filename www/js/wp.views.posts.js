/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";

wp.views.PostsPage = wp.views.Page.extend( {
	template_name: 'posts',
	
	syncedonce: false, // Have we tried to sync at least once?
	
	syncing: false,
	
	rendered: false,
	
	dragging: false,
	
	events: _.extend( {
		'click button.add'      : 'showEditor',
		'click button.settings' : 'showSettings',
		'click button.logo'     : 'showAbout',
		'click button.menu'     : 'toggleMenu',
		'click button.refresh'  : 'sync',
		'click li.menu-item'    : 'switchBlog'
	} ),
	
	initialize: function() {
		this.posts = wp.app.posts;
		
		this.listenTo( wp.app, 'currentBlogChanged', this.onBlogChanged );
		this.listenTo( this.posts, 'selected', this.viewPost );
		this.listenTo( this.posts, 'add', this.render );
		this.listenTo( this.posts, 'remove', this.render );
				
		if ( this.posts.length === 0 ) {
			this.refresh();
		} else {
			this.render();
		}
	},
	
	render: function() {

		// Ensure that no loading spinner is showing
		wp.app.hideLoadingIndicator();
		
		if( ! this.rendered ) {
			this.rendered = true;

			var template = wp.views.templates[this.template_name].text;
	
			// update the dom.
			this.$el.html( template );

		}
		
		this.renderMenu();
		this.renderPosts();
		
		return this;
	},
	
	renderPosts: function() {
		var collection = this.posts;
		var content = this.el.querySelector( '.content' );
		content.innerHTML = '';

		for( var i = 0; i < collection.length; i++ ) {
			var post = collection.at(i);
			var view = new wp.views.Post( { 'model': post } );
			content.appendChild( view.el );
		}
	},
	
	renderMenu: function() {
		var html = '';
		for( var i = 0; i < wp.app.blogs.length; i++ ) {
			var blog = wp.app.blogs.at( i );
			var cls = 'menu-item';
			if ( blog === wp.app.currentBlog ) {
				cls += ' current-blog';
			}
			html += '<li class="' + cls + '" data-idx="' + i + '">' + blog.get( 'blogName' ) + '</li>';
		}
    
		this.el.querySelector( '.blog-list' ).innerHTML = html;
	},
	
	switchBlog: function( event ) {
		try {
			var el = event.target;
			var idx = parseInt( el.getAttribute( 'data-idx' ), 10 );
				
			var blog = wp.app.blogs.at( idx );
			if ( blog !== wp.app.currentBlog ) {
				wp.app.setCurrentBlog( blog );
			}
        
			this.toggleMenu();
        
		} catch( e ) {
			wp.log( e );
		}
	},

	onBlogChanged: function() {
		this.render();

		this.syncedonce = false;
		this.refresh();
	},
	
	toggleMenu: function( evt ) {
		$( 'x-shiftbox' )[0].toggle();
	},
	
	viewPost:function( model ) {
		// if we are not pulling to refresh...
		if( this.dragging ) {
			return;
		}

		window.open( model.get( 'link' ), '', 'resizable=yes,scrollbars=yes,status=yes' );
	},
	
	refresh: function() {

		var self = this;
		var p = this.posts.fetch( { 'where': { 'index': 'blogkey', 'value': wp.app.currentBlog.id } } );
		p.success( function() {
			
			self.render();
					
			if( self.posts.length == 0 && ! self.syncedonce ) {
				// If we haven't tried to sync at least once, do so. 
				if( self.syncing ) {
					return; 
				}
				
				wp.app.showLoadingIndicator();
				var promise = self.sync();
				promise.always( function() {
					wp.app.hideLoadingIndicator();
				} );
			}

		} );
		p.fail( function() {
			alert( p.result() );
		} );

		return p;
	},
	
	sync: function() {

		if( ! wp.app.isNetworkAvailable() ) {
			alert( _s( 'prompt-network-missing' ) );
			return;
		}
		
		this.syncing = true;
		
		$( '.refresh' ).addClass( 'refreshing' );
		
		var self = this;
		var p = wp.models.Posts.fetchRemotePosts();
		p.success( function() {
			self.syncedonce = true;
			self.refresh();
		} );
		p.fail(function() {
			var result = p.result();
			var msg = _s( 'prompt-problem-syncing' );
			if ( result.status == 0 && result.readyState == 0 ) {
				msg = _s( 'prompt-bad-url' );
			} else if( result.faultCode ){
				if ( result.faultCode == 403 ) {
					msg = _s( 'prompt-bad-username-password' );
				} else {
					msg = result.faultString;
				}
			}
			alert( _s( msg ) );
		} );
		p.always( function() {
			self.syncing = false;
			$( '.refresh' ).removeClass( 'refreshing' );
		} );

		return p;
	},
	
	showEditor: function() {
		
		try {
			if( typeof MozActivity === 'undefined' ) {
				wp.nav.push( 'editor' );
				return;
			}
			
			var self = this;
			// Start a Moz picker activity for the user to select an image to upload
			// either from the gallery or the camera. 
			var activity = new MozActivity( {
				'name': 'pick',
				'data': {
					'type': 'image/jpeg'
				}
			} );
					
			activity.onsuccess = function() {
				wp.app.selected_image_blob = activity.result.blob;
				wp.nav.push( 'editor' );
			};
	
			activity.onerror = function() {
				wp.log( 'There was an error picking an image with the picker.' );
			};
			
		} catch( e ) {
			// Checking typeof(MozActivity) in a browser throws an exception in some versions of Firefox. 
			// just pass thru.
			wp.nav.push( 'editor' );
			return; 
		}
	},

	showAbout: function() {
		wp.nav.push( 'about', 'coverUp' );
	},
	
	showSettings: function() {
		this.toggleMenu();
		wp.nav.push('settings', 'coverUp');
	}
	
} );
wp.views.registerTemplate( 'posts' );


wp.views.Post = Backbone.View.extend( {
	model: null, 
	
	template_name: 'post',
	
	events: _.extend( {
		'click div.photo-btn': 'showPost',
		'click button.upload': 'upload',
		'click button.discard': 'discard'
	}),
	
	initialize: function( options ) {
		this.model = options.model;
		
		this.listenTo( this.model, 'progress', this.render );
		this.listenTo( this.model, "destroy", this.remove );
		this.render();
	},
	
	render: function( progress ) {
		var div = document.createElement( 'div' );
		div.innerHTML = wp.views.templates[this.template_name].text;

		var html = '';
		var postContent;
		var captionStr;

		// Strip the HTML from the post content
		var ele = document.createElement( 'div' );
		ele.innerHTML = this.model.get( 'post_content' );
		postContent = ele.textContent;

		// Look for a caption
		if( postContent.indexOf( '[/caption]' ) !== -1 ) {
			var pos = postContent.indexOf( '[/caption]' ) + 10;

			captionStr = postContent.substring( 0, postContent.indexOf( '[/caption]' ) );
			captionStr = captionStr.substring( captionStr.lastIndexOf( ']' ) + 1 ).trim();

			postContent = postContent.substr( pos );
		}

		if ( postContent.length > 160 ) {
			postContent = postContent.substr( 0, 160 );
			postContent = postContent.substr( 0, postContent.lastIndexOf( ' ' ) );
			postContent = postContent + "...";
		}
		
		// Caption
		var captionEl = div.querySelector( '.caption' );
		if ( captionStr ) {
			captionEl.innerHTML = captionStr;
		} else {
			captionEl.className += ' hidden';
		}
		
		// Title 
		var postTitle = this.model.get( 'post_title' );
		var titleEl = div.querySelector( '.post-title' );
		if ( postTitle ) {
			titleEl.innerHTML = postTitle;
		} else {
			titleEl.className += ' hidden';
		}
		
		// Summary
		var contentEl = div.querySelector( '.post-content' );
		if ( postContent ) {
			contentEl.innerHTML = postContent;
		}
		
		// Date
		var formattedDate = this.formatGMTDate( this.model.get( 'local_date' ) );
		var dateEl = div.querySelector( '.post-date' );
		dateEl.innerHTML = formattedDate;
		
		// Photo
		var img = div.querySelector( '.photo img' );
		var image = this.model.image();
		if( image && image.link ) {
			if( image.link.indexOf( 'data:image' ) === 0 ) {
				// data url so don't use photon.
				img.src = image.link;
			} else {
				// TODO: If private blog then do not use photon.
				img.src = 'http://i0.wp.com/' + image.link.replace( /.*?:\/\//g, '' ) + '?w=' + $( '.photo' ).width();
			}

		} else {
			img.src = "";
			// Hide image and caption if there is no image
			var photo = div.querySelector( '.photo' );
			photo.className += ' hidden';

			// Enable no-image styling for posts
			var postBody = div.querySelector( '.post-content' );
			postBody.className += ' noimage';
		}
		

		//if local draft
		var mask = div.querySelector( '.upload-mask' );
		if ( this.model.isLocalDraft() || this.model.isSyncing() ) {
			$( mask ).removeClass( 'hidden' );
			
			var progressDiv = div.querySelector( '.progress' );
			var buttonDiv = div.querySelector( 'div.upload' );
			
			if( this.model.isSyncing() ) {
				// If we're syncing show progress.
				$(buttonDiv).addClass( 'hidden' );
				$(progressDiv).removeClass( 'hidden' );
				
				var el = div.querySelector( '.progress span' );
				var progressStr = this.model.sync_status;
				if( progress ) {
					progressStr = progress.status;
				}
				el.innerHTML = progressStr;
				
			} else {
				// Else show the upload button.
				$( progressDiv ).addClass( "hidden" );
				$( buttonDiv ).removeClass( "hidden" );
			}
			
		} else {
			$( mask ).addClass( "hidden" );
		}

		this.$el.html( div.querySelector( 'div' ) );
	
		return this;
	},
	
	formatGMTDate: function( date ) {
		
		return date.toLocaleDateString();
	
		// Fix the gmt time.
/*
		var gmt = new Date();
		var offset = date.getTimezoneOffset() * 60000;
		gmt = new Date(gmt.valueOf() + offset);
				
		var diff = gmt - date.valueOf();
*/
		var diff = Date.now() - date.valueOf();
				
		var d = '';
		if ( diff < 60000 ) {
		    // seconds
		    d = Math.floor( diff / 1000 ) + 's';
		} else if ( diff < 3600000) {
		    // minutes
		    d = Math.floor(diff / 60000 ) + 'm';
		} else if ( diff < 86400000 ) {
		    // hours
		    d = Math.floor( diff / 3600000 ) + 'h';
		} else {
		    // days 
		    d = Math.floor( diff / 86400000 ) + 'd';
		}
		
		return d;
	},
	
	showPost: function( evt ) {
		if ( this.model.isLocalDraft() ) {
			return;
		}
		this.model.collection.trigger( 'selected', this.model );
	},
	
	upload: function() {
		this.model.uploadAndSave();		
	},
	
	discard: function() {
		if ( confirm( _s( 'prompt-discard-post?' ) ) ) {
			this.model.destroy();
		}
	},

} );
wp.views.registerTemplate( 'post' );
