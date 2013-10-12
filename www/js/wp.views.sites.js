/*

	Views require that their templates be loaded in the dom before being called.
	
*/
"use strict";

wp.views.SitesPage = wp.views.Page.extend( {
	template_name: 'sites',
	sites: null,
	saving: false,
	
	events: _.extend( {
		'click button.back': 'goBack',
		'click button.select-all': 'selectAll',
		'click button.add-selected': 'addSelected',
		'click ul': 'toggleSelected'
	} ),
	
	initialize: function( options ) {
		this.sites = options.sites;
		this.render().updateButtons();
	},
	
	render: function() {
		var template = wp.views.templates[this.template_name].text;
		this.$el.html( template );
		
		var ul = this.el.querySelector( '.sites' );
		for( var i = 0; i < this.sites.length; i++ ) {
			var site = this.sites.at( i );
			ul.innerHTML += '<li data-idx="' + i + '">' + site.get( 'blogName' ) + '</li>';
		}

		var li = ul.querySelector( 'li' );
		$( li ).addClass( 'selected' );
		
		return this;
	},
	
	updateButtons: function() {
		var selectAllBtn = $( 'button.select-all' );
		var addSelectedBtn = $( 'button.add-selected' );
		var selected = this.el.querySelectorAll( '.selected' ).length;

		addSelectedBtn.innerHTML = _s( 'control-add-selected' ) + ' (' + selected + ')';
		addSelectedBtn.disabled = ( selected == 0 );
		
		if ( selected == this.sites.length ) {
			selectAllBtn.innerHTML = _s( 'control-deselect-all' );
		} else {
			selectAllBtn.innerHTML = _s( 'control-select-all' );
		}
	},
	
	goBack: function() {
		if ( this.saving ) {
			return;
		}
		
		wp.nav.pop();
	},
	
	selectAll: function() {
		var lis = this.el.querySelectorAll( 'li' );
		var selected = this.el.querySelectorAll( '.selected' ).length;
		if (selected == this.sites.length ) {
			for ( var i = 0; i < lis.length; i++ ) {
				$( lis[i] ).removeClass( 'selected' );
			}
		} else {
			for ( var i = 0; i < lis.length; i++ ) {
				$( lis[i] ).addClass( 'selected' );
			}
		}
		this.updateButtons();
	},
	
	addSelected: function() {
		this.saving = true;
		
		this.el.querySelector( ".back" ).disabled = true;
		
		// Mark the first one selected as the starting blog and fetch its posts.
		var selected = this.el.querySelectorAll( '.selected' );
		var first;
		for ( var i = 0; i < selected.length; i++ ) {
			var idx = parseInt( selected[i].getAttribute( 'data-idx' ) );
			var site = this.sites.at( idx );
			site.save();
			
			if ( i == 0 ) {
				first = site;
			}
		}
		
		wp.app.blogs.fetch();
		wp.app.setCurrentBlog( first );
		
		if( ! wp.app.isNetworkAvailable() ) {
			this._onAddSelectedAlways();
			return;
		}
		
		wp.app.showLoadingIndicator();

		var promise = wp.models.Posts.fetchRemote();
		promise.success( _onAddSelectedSuccess );
		promise.always( _onAddSelectedAlways );

	},
	
	_onAddSelectedSuccess: function() {
		wp.app.posts.fetch( { 'where': { 'index': 'blogkey', value:wp.app.currentBlog.id } } );
	},
	
	_onAddSelectedAlways: function() {
		wp.app.hideLoadingIndicator();
		wp.nav.setPage( 'posts', null, true );
	},
	
	toggleSelected: function( event ) {
		var li = event.target;
		li = $( li );
		if ( li.hasClass( 'selected' ) ) {
			li.removeClass( 'selected' );
		} else {
			li.addClass( 'selected' );
		}
		
		this.updateButtons();
	}
	
} );
wp.views.registerTemplate( 'sites' );
