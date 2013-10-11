/*
	Models
	
	The app defines the following models:
		blog
		post
	
	See each model for details.

*/

"use strict";

if( typeof wp === 'undefined' ) { 
	var wp = {};
}

if( typeof wp.models === 'undefined' ) {
	wp.models = {};
}


/*
	user: http://codex.wordpress.org/XML-RPC_WordPress_API/Users
	wp.getUsersBlogs
		string username
		string password

*/
wp.models.Blog = Backbone.Model.extend( {
	store: 'blogs',
	idAttribute: 'xmlrpc',
	defaults: {
		username: '',
		password: '',
		blogid: '',
		blogName: '',
		url: '',
		xmlrpc: '',
		options: []
	},
	
	initialize: function( attributes, options ) {
		if( attributes.blogid ) {
			// We do this because "blogid" is the oddball result and 
			// "blog_id" is expected just about everywhere else.
			this.set( 'blog_id', attributes.blogid );
		}
	},
	
	parse: function( response ) {
		if( response.blogid ) {
			// We do this because "blogid" is the oddball result and 
			// "blog_id" is expected just about everywhere else.
			if ( this.get( 'blog_id' ) !== response.blogid ) {
				response.blog_id = response.blogid;
			}
		}
		return response;
	},
	
	fetchRemoteOptions: function() {
		wp.log( 'fetching remote options' );
		
		// Limit options returned to just the ones we're interested in:
		var opts = [
			'blogname',
			'software_version',
			'gmt_offset',
			'thumbnail_size_w',
			'thumbnail_size_h',
			'medium_size_w',
			'medium_size_h',
			'large_size_w',
			'large_size_h'
		];

		var promise = wp.api.getOptions( opts );
		var onSuccess = this.onGetOptionsSuccess.bind( this, promise );
		var onFail = this.onGetOptionsFail.bind( this, promise );
		promise.success( onSuccess );
		promise.fail( onFail );
	},
	
	onGetOptionsSuccess: function( promise ) {
		wp.log( 'options success', promise.result() );
		this.set( 'options', promise.result() );
		this.save();
	},
	
	onGetOptionsFail: function( promise ) {
		wp.log( 'options failed', promise.result() );
	},
	
	isWPCom: function() {
		// TODO: Check options instead of url.
		var xmlrpc = this.get( 'xmlrpc' );
		return ( xmlrpc.indexOf( 'wordpress.com' ) !== -1 );
	},
	
	/*
		Removes the blog and its posts from the db.
		Calls destroy to remove the blog from its collection.
	*/
	remove: function() {
		var promise = wp.db.removeAll( 'posts', 'blogkey', this.id );
		var onSuccess = this._onDbRemoveAllSuccess.bind( this );
		promise.success( onSuccess );
		promise.fail( this._onDbRemoveAllFail );
	},
	
	_onDbRemoveAllSuccess: function() {
		wp.log( "all blog's posts deleted");
		this.destroy()
		.success( this._onDestroySuccess )
		.fail( this._onDestroyFail );
	},
	
	_onDbRemoveAllFail: function() {
		wp.log( 'failed to delete posts' );
	},
	
	_onDestroySuccess: function() {
		wp.log( 'Blog was removed' );
	},
	
	_onDestroyFail: function() {
		wp.log( 'Failed to delete blog' );
	}
	
}, {} );

wp.models.Blogs = Backbone.Collection.extend( {
	store: 'blogs',
	model: wp.models.Blog,
	comparator: function( blog ) {
		return blog.get( 'blogName' ).toLowerCase();
	}
	
}, {
	fetchRemoteBlogs: function( url, username, password ) {
		var promise = wp.promise();
		var rpc = wp.api.getUsersBlogs( url, username, password );
		var onSuccess = this.onFetchRemoteBlogsSuccess.bind( this, promise, rpc, username, password );
		var onFail = this.onFetchRemoteBlogsFail.bind( this, promise, rpc );
		rpc.success( onSuccess );
		rpc.fail( onFail );
		return promise;
	},

	onFetchRemoteBlogsSuccess: function( promise, rpc, username, password ) {
		wp.log( 'blogs rpc success' );
		try {
			var res = rpc.result();
			var collection = new wp.models.Blogs( res );
			for( var idx in collection.models ) {
				var model = collection.models[idx];
				
				// encrypt password
				var enc = CryptoJS.AES.encrypt( password, username );
				var pass = enc.toString();
				
				model.set( 'username', username );
				model.set( 'password', pass );
				// Fetching only, don't save. Let the caller decide whether to save.
			}
			wp.log( 'resolving' );
			promise.resolve( collection );
			
		} catch( e ) {
			wp.log( e );
		}
	},
	
	onFetchRemoteBlogsFail: function( promise, rpc ) {
		// TODO:
		wp.log( 'failed', rpc.result() );
		promise.discard( rpc.result() );
	}
	
});


/*
	posts: http://codex.wordpress.org/XML-RPC_WordPress_API/Posts

    string post_id
    string post_title
    datetime post_date
    datetime post_date_gmt
    datetime post_modified
    datetime post_modified_gmt
    string post_status
    string post_type
    string post_format
    string post_name
    string post_author 
    string author_id
    string post_password
    string post_excerpt
    string post_content
    string post_parent
    string post_mime_type
    string link
    string guid
    int menu_order
    string comment_status
    string ping_status
    bool sticky
    struct post_thumbnail
    array terms
		struct
    array custom_fields
		struct
			string id
			string key
			string value 
	struct enclosure
		string url
		int length
		string type

	The in addition to the list of fields returned by the XMLRPC api, '
	the Post model has the following fields:
	string blogkey  - used with indexeddb
	struct photo	- A media item from the posts media library. Only populated if there is no post_thumbnail and the post DOES have items in its media library.
	struct pending_photo - The photo data for a local draft of a post.
	
	struct photo: http://codex.wordpress.org/XML-RPC_WordPress_API/Media    
		datetime date_created_gmt
		string parent: ID of the parent post.
		string link
		string thumbnail
		string title
		string caption
		string description
		string metadata
		string attachment_id (Added in WordPress 3.4)

	struct pending_photo: 
		string caption
		string link	- This is a dataurl for the image src. Stored in the link for convenience.

*/
wp.models.Post = Backbone.Model.extend( {
	store: 'posts',
	
	idAttribute: 'link',
	
	_isSyncing: false,
	
	sync_status: null,
	
	defaults: {
		'blogkey': '',
		'post_id': '',
		'post_title': '',
		'post_date_gmt': null,
		'post_date': null,
		'local_date': null,
		'post_status': 'publish',
		'link': '',
		'terms_names': null,
		'post_thumbnail': null,
		'photo': null, // Saved item from wp.getMediaLibrary
		'pending_photo': null // image data awaiting upload
	},

	initialize: function() {
		var obj = {};
		if ( this.get( 'link' ) === '' ) {
			obj.link = wp.models.Post.GUID();
		}

		if( this.get( 'post_date' ) == null ) {
			obj.post_date = new Date();
			obj.post_date_gmt = new Date(); //new Date(obj.post_date.valueOf() - (obj.post_date.getTimezoneOffset() * 60000));
			obj.local_date = new Date();
		}

		if ( this.get( 'blogkey' ) === '' ) {
			obj.blogkey = wp.app.currentBlog.id;
		}

		this.set( obj );
	},
	
	isLocalDraft: function(){
		return ( this.get( 'link' ).indexOf( 'http' ) === -1 );
	},
	
	isSyncing: function() {
		return this._isSyncing;	
	},
	
	parse: function( attr ) {
		if( typeof attr === 'string' ) {
			return attr;
		}
		
		if( ( attr.post_thumbnail instanceof Array ) && ( attr.post_thumbnail.length === 0 ) ) {
			attr.post_thumbnail = null;
		}

		if( attr.link && attr.link.indexOf( 'http' ) !== -1 ) {
			if( attr.post_date_gmt ) {
				var gmt = attr.post_date_gmt;
				attr.local_date = new Date( gmt.valueOf() - ( gmt.getTimezoneOffset() * 60000 ) );
			}
		}

		return attr;
	},
	
	image: function() {
		return this.get( 'pending_photo' ) || this.get( 'post_thumbnail' ) || this.get( 'photo' );
	},

	setPendingPhoto: function( image_data, caption ) {
		wp.log( 'post.setPendingPhoto' );
		caption = caption || null;
		var obj = {
			link: image_data,
			caption: caption
		};
		this.set( { 'pending_photo': obj } );
	},
	
	uploadAndSave: function( image_data, caption ) {
		wp.log( 'post.uploadAndSave' );
		// Save the image data and caption to be uploaded.
		if( image_data ) {
			this.setPendingPhoto( image_data, caption );
		}

		this._isSyncing = true;

		this.upload_promise = wp.promise();
		
		if ( ! this.get(' pending_photo' ) ) {
			// No photo provided, and no photo pending.  This could be an interrupted save. 
			this._saveRemote();
		} else {
			this._upload();		
		}
	
		return this.upload_promise;
	},
		
	_upload: function() {
		wp.log( 'post.uploadAndSave_Upload' );
		// Upload the image.
		// And report progress
		this.sync_status = _s( 'Uploading...' );
		this.trigger( 'progress', { 'status': 'Uploading...', 'percent': 1 } );
		
		var pending_photo = this.get( 'pending_photo' );
		if( ! pending_photo ) {
			return;
		}
		
		var filename = 'image_' + Date.now() + '.png';
		var bits = pending_photo.link.split( ',' )[1]; // Grab the data portion of the dataurl.

		var data = {
			'name':filename,
			'type':'image/png',
			'bits':new wp.XMLRPC.Base64( bits, false ) // Its already base64 encoded, so just wrap it, don't encode again.
		};

		var promise = wp.api.uploadFile( data );
		wp.log( 'post.uploadAndSave_Upload: uploadFile called' );
		
		var onSuccess = this._onUploadSuccess.bind( this, promise );
		var onProgress = this._onUploadProgress.bind( this );
		var onFail = this.onErrorSaving.bind( this );
		
		promise.success( onSucess );
		promise.progress( onProgress);
		promise.fail( onFail );

	},
	
	_onUploadProgress: function( obj ) {
		// obj will be a progress event. 
		var percent = Math.floor( ( obj.loaded / obj.total ) * 100 );
		wp.log( 'Progress', percent, obj );
		this.trigger( 'progress', { 'status': 'Uploading...', 'percent': percent } );
	},
	
	_onUploadSuccess: function( promise ) {
		wp.log( 'post._uploadSuccess' );
			// Update content here while we have it just in case there is 
			// an error saving to the db in the next step. 
			var result = promise.result();
			var url = result.url;
			var pending_photo = this.get( 'pending_photo' );
			var html = '';
			var img = '<a href="' + url + '"><img src="' + url + '" /></a>';
			if ( pending_photo.caption ) {
				html = '[caption id="attachment_' + result.id + '" align="aligncenter" width="500"]';
				html += '<a href="' + url + '"><img src="' + url + '" width="100%" /></a>';
				html += pending_photo.caption;
				html += '[/caption]\n';
			} else {
				html = img + "<br /><br />";
			}
			
			var content = this.get( 'post_content' );
			content = html + content;

			// Update content. Hang onto the pending photo until we've finished synching.
			this.set( { 'post_content': content } );

			this._saveRemote();
	},
	
	_saveRemote: function() {
		wp.log( 'post._saveRemote' );
		
		this.sync_status = _s( 'publishing' );
		this.trigger( 'progress', { 'status': 'Publishing...' } );
		
		var promise = wp.api.newPost( this.getUploadDict() );
		var onSuccess = this._onSaveRemoteSuccess.bind( this, promise );
		var onFail = this.onErrorSaving.bind( this );
		promise.success( onSuccess );
		promise.fail( onFail );

		return promise;
	},
	
	_onSaveRemoteSuccess: function( promise ) {
		wp.log( 'post.uploadAndSave_SaveRemote:  Success' );
		var post_id = promise.result();
		this._syncRemote( post_id );
	},
	
	_syncRemote: function( post_id ) {
		wp.log( 'post._syncRemote' );
		
		this.sync_status = _s( 'syncing' );
		this.trigger( 'progress', { 'status': 'Syncing...' } );

		// Since we only get the post ID back from a save make a request
		// for the full post content. Its cannonical after all. 
		// We'll use a promise queue to also get the updated media library
		// which should have the media item for the photo we uploaded.
		var queue = wp.promiseQueue();

		// Fetch the cannonical post.
		var promise = wp.api.getPost( post_id );
		var onSuccess = this._onGetPostSuccess.bind( this, promise );
		var onFail = this.onErrorSaving.bind( this );
		promise.success( onSuccess );
		promise.fail( onFail );
		
		queue.add( promise );

		// Fetch the media library
		var filter = {
			'number': 1,
			'parent_id': post_id,
			'mime_type': 'image/*'
		};
		var promise = wp.api.getMediaLibrary( filter );
		onSuccess = this._onGetMediaLibrarySuccess.bind( this, promise );
		promise.success( onSuccess );
		
		queue.add( promise );

		// Finalize the save process
		onSuccess = this._saveFinal.bind( this );
		
		queue.success( onSuccess );
		queue.fail( onFail );
	},
	
	_onGetPostSuccess: function( promise ) {
		wp.log( 'post.uploadAndSave_SyncRemote: Synced cannonical post' );
		
		// Save the guid used as a temporary link. We'll want to delete this record after we save.
		this.temp_link = this.get( 'link' );

		// update all attributes.
		this.set( this.parse( promise.result() ) );
	},
	
	_onGetMediaLibrarySuccess: function( promise ) {
		wp.log( 'post.uploadAndSave_SyncRemote: retrieved media item', p1.result() );

		var res = promise.result();
		if ( ( res instanceof Array ) && ( res.length > 0 ) ) {
			this.set( { 'photo': res[0], 'pending_photo': null } );
		}
	},
	
	_saveFinal: function() {
		wp.log( 'post.uploadAndSave_SaveFinal' );
		
		var promise = this.save();
		var onSuccess = this._onSave.bind( this );
		var onFail = this.onErrorSaving.bind( this );

		promise.success( onSuccess );
		promise.fail( onFail );
	},
	
	_onSave: function() {
		// Yay! Finally all done!
		wp.log( 'post.uploadAndSave_SaveFinal: Success' );
		this._isSyncing = false;
		// this.upload_promise.notify({"status":"success"});
		this.sync_status = null;
		this.trigger( 'progress', { 'status': 'success' } );
		this.upload_promise.resolve( this );
		this.upload_promise = null;
		
		// We saved after updating the link.  Since this is also the db key, 
		// we need to remove the old record.
		if ( this.temp_link ) {
			if( this.temp_link !== this.get( 'link' ) ) {
				wp.db.remove( this.store, this.temp_link );
			}
		}

	},
	
	onErrorSaving: function(){
		wp.log( 'post.onErrorSaving' );
		
		this._isSyncing = false;
		this.trigger( 'progress', { 'status': 'failed' } );
		this.upload_promise.discard();
		this.upload_promise = null;	
		this.save(); // Save locally we don't loose the post.

	},
	
	getUploadDict:function() {
		var obj = {};
		var dict = this.attributes;
		for ( var key in dict ) {
			if( dict[key] != '' && dict[key] != null) {
				obj[key] = dict[key];
			}
		}

		delete obj.blogkey;
		delete obj.photo;
		delete obj.pending_photo;
		delete obj.link;
		delete obj.local_date;
		
		return obj;
	}
	

}, {
	GUID: function() {
		function S4() {
			return ( ( ( 1 + Math.random() ) * 0x10000) | 0 ).toString( 16 ).substring( 1 );
		}
		return ( S4() + S4() + '-' + S4() + '-4' + S4().substr( 0, 3 ) + '-' + S4() + '-' + S4() + S4() + S4() ).toLowerCase();
	}
});

wp.models.Posts = Backbone.Collection.extend({
	store: 'posts',
	model: wp.models.Post,
	
	comparator: function( post ) {
		// Sorts the list from newest to oldest.
		// Local drafts should always be first so we return the negative of the current date.
		try{
			return - post.get( 'local_date' ).valueOf();
		} catch( e ) {
			return 0;
		}
	}
	
}, {

	needsCleanup: false,
	
	/*
		Fetch remote posts.
		offset: 
	*/
	fetchRemote: function( offset ) {
		// Clean up only if no offset ( loading more )
		this.needsCleanup = ! Boolean( offset );

		var promise = wp.promise();

		// Fetch the list of posts.
		var rpc = wp.api.getPosts( offset );
		var onSuccess = this._onGetPostsSuccess.bind( this, promise, rpc );
		var onFail = this._onGetPostsFail.bind( this, promise, rpc );
		rpc.success( onSuccess );
		rpc.fail( onFail );
		
		return promise;
	},
	
	_onGetPostsSuccess: function( promise, rpc ) {
		
		var res = rpc.result();
		
		// Create a new posts collection	
		var collection = new wp.models.Posts( res, { 'parse': true } );

		var blog = wp.app.currentBlog;

		var posts = []; // Posts that need an image.
		var calls = []; // Array of requests formated for system.multicall
		
		for ( var i = 0; i < collection.length; i++ ) {
			var post = collection.at( i );
			
			// set the blog key for the results
			post.set( 'blogkey', blog.id );
			
			// for each post, if it does not have a featured image add it to the multicall.
			if ( post.get( 'post_thumbnail' ) == null ) {
				var filter = {
					number: 1,
					parent_id: post.get( 'post_id' ),
					mime_type: 'image/*'
				};
				
				var call = wp.api.formatForSystemMulticall( 'wp.getMediaLibrary', filter );
				calls.push( call );
				posts.push( post );
			}
		}

		// if there is nothing for the multicall save the posts.
		if ( posts.length === 0 ) {
			this._saveFetchedPosts( promise, collection );
			return;
		}

		// Perform the multicall to get post media.
		var multicall = wp.api.systemMulticall( calls );
		var onSuccess = this._onMulticallSuccess.bind( this, multicall, promise, collection, posts );
		var onFail = this._onMulticallFail.bind( this, promise, collection );
		multicall.success( onSuccess );
		multicall.fail( onFail );
	},
	
	_onGetPostsFail: function( promise, rpc ) {
		wp.log( 'Fetch remote posts failed.', rpc.result() );
		promise.discard( rpc.result() );
	},
	
	_onMulticallSuccess: function( multicall, promise, collection, posts ) {
		var res = multicall.result(); // should be an array of wp.getMediaLibrary responses.

		for ( var i = 0; i < posts.length; i++ ) {
			var post = posts[i];
			var media;
			try {
				media = res[i][0];
			} catch ( e ) {
				media = res[i];
			}
			if ( ( media instanceof Array ) && ( media.length > 0 ) ) {
				// Clear pending media here just incase something bad happened during an upload.
				post.set( { photo: media[0], pending_photo: null } ); 
			}
		}

		this._saveFetchedPosts( promise, collection );
	},

	_onMulticallFail: function( promise, collection ) {
		wp.log( 'System Multicall to fetch media libraries failed.' );
		this._saveFetchedPosts( promise, collection );
	},

	_saveFetchedPosts: function( promise, collection ) {
		if ( this.needsCleanup ) {
			this._cleanup( promise, collection );
			return;
		}
	
		// No posts to save so we can skip the promise queue.
		if ( collection.length === 0 ) {
			this._onSaveFetchedPostsSuccess( promise, collection );
			return;
		}

		var queue = wp.promiseQueue();
		var onSuccess = this._onSaveFetchedPostsSuccess.bind( this, promise, collection );
		queue.success( onSuccess );

		for( var i = 0; i < collection.length; i++ ) {
			var post = collection.at( i );
			queue.add( post.save() );
		}
	},
	
	_onSaveFetchedPostsSuccess: function( promise, collection ) {
		// Finally!
		promise.resolve( collection );
	},
	
	// Clear posts from the database.
	// Bascially we'll purge everything that is not a local draft since we're just replacing it with the 
	// most current version retrieved during a sync. Never call _cleanup when performing a "load more".
	_cleanup: function( promise, collection ) {
		this.needsCleanup = false;

		var p = wp.db.findAll( 'posts', 'blogkey', wp.app.currentBlog.id );
		var onSuccess = this._onCleanupFindSuccess.bind( this, p, promise, collection );
		var onFail = this._saveFetchedPosts.bind( this, promise, collection );
		p.success( onSuccess );
		p.fail( onFail );
	},
	
	_onCleanupFindSuccess: function( p, promise, collection ) {
		var posts = p.result();
		var oldposts = [];
		
		for ( var i = 0; i < posts.length; i++ ) {
			if ( posts[i].link.indexOf( 'http' ) !== 0 ) {
				// this is a local draft, don't delete it.
				continue;
			}
			oldposts.push( posts[i].link );
		}

		if ( oldposts.length == 0 ) {
			this._saveFetchedPosts( promise, collection );
			return;
		}

		// Delete the old posts.
		p = wp.db.removeAll( 'posts', 'blogkey', wp.app.currentBlog.id, oldposts, 'link' );
		var onFail = this._onCleanupRemoveFail;
		var onAlways = this._saveFetchedPosts.bind( this, promise, collection );
		p.always( onAlways );
	},
	
	_onCleanupRemoveFail: function() {
		wp.log( "Error removing old posts" );
	}
		
} );
