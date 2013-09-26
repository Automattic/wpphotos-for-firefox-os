/*


*/

"use strict";

if( typeof wp === 'undefined' ) {
	var wp = {};
}

wp.Routes = Backbone.Router.extend( {

	currentPage: null,
	
	stage: null,

	initialize: function( options ) {
		this.stage = document.getElementById( 'stage' );
	},
		
	routes: {
		'start': 'start',
		'login': 'login',
		'about': 'about',
		'settings': 'settings',
		'posts': 'posts',
		'editor': 'editor',
		'goBack': 'goBack'
	},
	
	start: function() {
		wp.log( 'wp.routes.start' );
		var view = new wp.views.StartPage();
		this.setView( view );
	},
	
	login: function() {
		wp.log( 'wp.routes.login' );
		var view = new wp.views.LoginPage();
		this.setView( view );
	},
	
	about: function() {
		wp.log( 'wp.routes.about' );
		var view = new wp.views.AboutPage();
		this.setView( view );
	},

	settings: function() {
		wp.log( 'wp.routes.settings' );
		var view = new wp.views.SettingsPage();
		this.setView( view );
	},
	
	posts: function() {
		wp.log( 'wp.routes.posts' );
		var view = new wp.views.PostsPage();
		this.setView( view );
	},
	
	editor: function() {
		wp.log( 'wp.routes.editor' );
		var view = new wp.views.EditorPage();
		this.setView( view );
	},
	
	setView:function( view ) {
		wp.log( 'wp.routes.setView' );
		// 
		if( this.currentPage ) {
			try {
				// call remove on backbone views to clean up events.
				this.currentPage.remove();
			} catch( e ) {
				wp.log( e );
			}
		}

		// Just incase...
		while ( stage.firstChild ) {
			stage.removeChild( stage.firstChild );
		}
		
		this.currentPage = view;
		this.stage.appendChild( view.el );
	}

});
