/*
	Models
	
	The app defines the following models:
		blog
		post
	
	See each model for details. 		

*/

"use strict";

if(typeof(wp) == "undefined") { var wp = {} };
if(typeof(wp.models) == "undefined") { wp.models = {} };


/*
	user: http://codex.wordpress.org/XML-RPC_WordPress_API/Users
	wp.getUsersBlogs
		string username
	    string password 

*/
wp.models.Blog = Backbone.Model.extend({
	store:"blogs",
	idAttribute:"xmlrpc",
	defaults:{
		username:"",
		password:"",
		blogid:"",
		blogName:"",
		url:"",
		xmlrpc:"",
		options:[]
	},
	
	initialize:function(attributes, options) {
		if(attributes["blogid"]) {
			// We do this because "blogid" is the oddball result and 
			// "blog_id" is expected just about everywhere else.
			this.set("blog_id", attributes["blogid"]);
		};
	},
	
	parse:function(response) {
		if(response["blogid"]) {
			// We do this because "blogid" is the oddball result and 
			// "blog_id" is expected just about everywhere else.
			if (this.get("blog_id") != response["blogid"]) {
				response["blog_id"] = response["blogid"];
			};
		};
		return response;
	},
	
	fetchRemoteOptions:function() {
		var self = this;
		
		// Limit ooptions returned to just the ones we're interested in:
		var ops = [
			"blogname",
			"gmt_offset",
			"thumbnail_size_w",
			"thumbnail_size_h",
			"medium_size_w",
			"medium_size_h",
			"large_size_w",
			"large_size_h"
		];

		var p = wp.api.getOptions(ops);
		p.success(function() {
			self.set("options", p.result());
			self.save();
		});
		p.fail(function(){
			// TODO
		});
	},
	
	isWPCom:function() {
		var xmlrpc = this.get("xmlrpc");
		return (xmlrpc.indexOf("wordpress.com") != -1);
	}
	
}, {});

wp.models.Blogs = Backbone.Collection.extend({
	store:"blogs",
	model:wp.models.Blog
}, {
	fetchRemoteBlogs:function(url, username, password) {
		
		var p = wp.promise();

		var rpc = wp.api.getUsersBlogs(url, username, password)
		
		rpc.success(function(){
			console.log("blogs rpc success");
			try {
				var res = rpc.result();
				var collection = new wp.models.Blogs(res);
				for(var idx in collection.models){
					var model = collection.models[idx];
					model.set("username", username);
					model.set("password", password);
					// Fetching only, don't save. Let the caller decide whether to save.
				};
				console.log("resolving");
				p.resolve(collection);
				
			} catch(e) {
				console.log(e);
			}
		});
		
		rpc.fail(function(){
			// TODO:
			console.log("failed");
			p.discard();
		});

		return p;
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
	struct photo 	- A media item from the posts media library. Only populated if there is no post_thumbnail and the post DOES have items in its media library.
	struct pending_photo - The photo data for a local draft of a post.
	
	strct photo: http://codex.wordpress.org/XML-RPC_WordPress_API/Media    
	    datetime date_created_gmt
	    string parent: ID of the parent post.
	    string link
	    string thumbnail
	    string title
	    string caption
	    string description
	    string metadata
	    string attachment_id (Added in WordPress 3.4)
	   
	strct pending_photo: 
		string caption
		string link	- This is a dataurl for the image src. Stored in the link for convenience.

*/
wp.models.Post = Backbone.Model.extend({
	store:"posts",
	idAttribute:"link",
	_isSyncing:false,
	defaults:{
		blogkey:"",
		post_id:"",
		post_title:"",
		post_date_gmt:null,
		post_date:null,
		post_status:"publish",
		link:"",
		terms_names:null,
		post_thumbnail:null,
		photo:null, // Saved item from wp.getMediaLibrary
		pending_photo:null // image data awaiting upload
	},

	initialize:function(){
		var obj = {};
		if (this.get("link") == "") {
			obj.link = wp.models.Post.GUID();
		};
		if(this.get("post_date") == null) {
			obj.post_date = new Date();
			obj.post_date_gmt = new Date(obj.post_date.valueOf() - (obj.post_date.getTimezoneOffset() * 60000));
		};
		if (this.get("blogkey") == "") {
			obj.blogkey = wp.app.currentBlog.id;
		};
		this.set(obj);
	},
	
	isLocalDraft:function(){
		return (this.get("link").indexOf("http") == -1);
	},
	
	isSyncing:function() {
		return this._isSyncing;	
	},
	
	parse:function(attr) {
		
		if(attr["post_thumbnail"] instanceof Array && attr["post_thumbnail"].length == 0) {
			attr["post_thumbnail"] = null;
		};
		
		return attr;
	},
	
	fetchRemoteMedia:function() {
		var self = this;

		var p = wp.promise();
		var filter = {
			number:1,
			parent_id:this.get("post_id"),			
			mime_type:"image/*"
		};
		
		var rpc = wp.api.getMediaLibrary(filter);
		rpc.success(function(){
			var res = rpc.result();
			
			if ((res instanceof Array) && (res.length > 0)){
				// Clear pending media here just incase something bad happened during an upload.
				self.set({photo:res[0], pending_photo:null}); 
			};

			var p1 = self.save();
			p1.success(function(){
				p.resolve();
			});
			p1.fail(function() {
				console.log("Failed saving from remote media")
			});
		});

		return p;
	},
	
	image:function(){
		return this.get("pending_photo") || this.get("post_thumbnail") || this.get("photo");
	},

	setPendingPhoto:function(image_data, caption) {
		caption = caption || null;
		var obj = {
			link:image_data,
			caption:caption
		};
		this.set({'pending_photo':obj});
	},
	
	uploadAndSave:function(image_data, caption) {
		// Save the image data and caption to be uploaded.
		if(image_data) {
			this.setPendingPhoto(image_data, caption);
		}; 

		this._isSyncing = true;

		this.upload_promise = wp.promise();
		
		if (!this.get("pending_photo")) {
			// No photo provided, and no photo pending, so save. 
			this.uploadAndSave_SaveRemote();
		} else {
			this.uploadAndSave_Upload();		
		};
	
		return this.upload_promise;
	},
		
	uploadAndSave_Upload:function() {

		// Upload the image.
		// And report progress
		this.trigger("progress", {"status":"uploading", "percent":1});
//		this.upload_promise.notify({"status":"uploading", "percent":1});
		
		var pending_photo = this.get("pending_photo");
		if(!pending_photo) return;
		
		var filename = "image_"+ Date.now() + ".png";
		var data = pending_photo.link.split(",")[1]; // Grab the data portion of the dataurl.
		var bits = new wp.XMLRPC.Base64(data, false); // Its already base64 encoded, so just wrap it, don't encode again.

		var data = {
			"name":filename,
			"type":"image/png",
			"bits":bits
		};

		var self = this;
		var p = wp.api.uploadFile(data);
		p.success(function() {
			// Update content here while we have it just in case there is 
			// an error saving to the db in the next step. 
			var result = p.result();
			var url = result.url;
			
			var html = "";
			var img = '<a href="' + url + '"><img src="' + url + '" /></a>';
			if (pending_photo.caption) {
				html = '[caption id="attachment_' + result.id + '" align="alignnone"]';
				html += '<a href="' + url + '"><img src="' + url + '" /></a>';
				html += pending_photo.caption;
				html += '[/caption]\n';
			} else {
				html = img + "<br /><br />";
			};
			
			var content = self.get("post_content");
			content = html + content;

			// Update content. Hang onto the pending photo until we've finished synching.
			self.set({post_content:content});

			self.uploadAndSave_SaveRemote();
		});
		p.progress(function(obj){
			// obj will be a progress event. 
			var percent = Math.floor((obj.loaded / obj.total) * 100);
			self.trigger("progress", {"status":"uploading", "percent":percent});
//			self.upload_promise.notify({"status":"uploading", "percent":percent});
		});
		p.fail(function() {
			console.log("Upload Failed");
			self.onErrorSaving();
		});
		
	},
	
	uploadAndSave_SaveRemote:function() {
//		this.upload_promise.notify({"status":"saving"});
		this.trigger("progress", {"status":"saving"});
		
		var self = this;
		var p = wp.api.newPost(this.getUploadHash());
		p.success(function() {
			var post_id = p.result();
			self.uploadAndSave_SyncRemote(post_id);
		});
		p.fail(function() {
			self.onErrorSaving();
		});
		
		return p;
	},
	
	uploadAndSave_SyncRemote:function(post_id) {
//		this.upload_promise.notify({"status":"syncing"});
		this.trigger("progress", {"status":"syncing"});

		// Since we only get the post ID back from a save make a request
		// for the full post content. Its cannonical after all. 
		// We'll use a promise queue to also get the updated media library
		// which should have the media item for the photo we uploaded.
		var self = this;
		var q = wp.promiseQueue();

		// Fetch the cannonical post.
		var p = wp.api.getPost(post_id);
		p.success(function() {
			// Save the guid used as a temporary link. We'll want to delete this record after we save.
			self.temp_link = self.get("link");

			// update all attributes.
			self.set(self.parse(p.result()));
		});
		p.fail(function() {
			self.onErrorSaving();
		});
		
		q.add(p);

		// Fetch the media library
		var filter = {
			number:1,
			parent_id:post_id,
			mime_type:"image/*"
		};
		var p1 = wp.api.getMediaLibrary(filter);
		p1.success(function(){
			var res = p1.result();
			if ((res instanceof Array) && (res.length > 0)){
				self.set({photo:res[0], pending_photo:null});
			};
		});
		
		q.add(p1);
		
		q.success(function(){
			self.uploadAndSave_SaveFinal();
		});
		q.fail(function(){
			self.onErrorSaving();
		});
	},
	
	uploadAndSave_SaveFinal:function() {
		var self = this;
		var p = this.save();
		p.success(function() {
			// Yay! Finally all done!
			
			self._isSyncing = false;
			// this.upload_promise.notify({"status":"success"});
			self.trigger("progress", {"status":"success"});
			self.upload_promise.resolve(self);
			
			// We saved after updating the link.  Since this is also the db key, 
			// we need to remove the old record.
			if (self.temp_link) {
				if(self.temp_link != self.get("link")) {
					wp.db.remove(self.store, self.temp_link);
				};
			};
		});
		p.fail(function() {
			//OMG ORLY?
			self.onErrorSaving();
		});
	},
	
	onErrorSaving:function(){

		this._isSyncing = false;
		this.trigger("progress", {"status":"failed"});
		this.upload_promise.discard();
		this.upload_promise = null;	

	},
	
	getUploadHash:function() {
		var obj = {};
		var hash = this.attributes;
		for (var key in hash) {
			if(hash[key] != "" && hash[key] != null) {
				obj[key] = hash[key];
			};
		};
		delete obj["blogkey"];
		delete obj["photo"];
		delete obj["pending"];
		delete obj["link"];
		
		return obj;
	}
	

}, {
	GUID:function() {
		var S4 = function () {
			return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		};
		return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
	}
});

wp.models.Posts = Backbone.Collection.extend({
	store:"posts",
	model:wp.models.Post,
	
	comparator:function(post) {
		// Sorts the list from newest to oldest.
		// Local drafts should always be first so we return the negative of the current date.
		try{
			if(post.isLocalDraft()){
				return -Date.now();
			};
			return -post.get("post_date_gmt").valueOf();
		} catch(e) {
			return 0;
		};
	}
	
}, {

	fetchRemotePosts:function(offset) {
		// Define collection outside of any closure so we can pass it to the
		// promise's resovle method, but other closures can work with it.
		var collection;
		
		// This promise is returned to the user.
		var p = wp.promise();		
		
		// The promise queue is for saving all the models.
		var q = wp.promiseQueue();
		q.success(function(){
			p.resolve(collection);
		});

		var rpc = wp.api.getPosts(offset);
		rpc.success(function(){
			var res = rpc.result();
			
			collection = new wp.models.Posts(res, {parse:true});

			var blog = wp.app.currentBlog;
			for (var i = 0; i < collection.length; i++) {
			
				// Wrapper to preserve model scope in the closure.
				(function(j) {
					var m = collection.at(i);
					m.set("blogkey", blog.id);

					var p;

					// If the post has a featured image we're good. Save the post. 
					// If no featured image, then fetch its media library.

					if(m.get("post_thumbnail") != null) {
						p = m.save();
					} else {
						p = m.fetchRemoteMedia(); // no featured image
					};

					p.success(function() {
						//TODO
					});

					p.fail(function(){
						//TODO
					});

					// Add the save promise to the promise queue.
					q.add(p);

				})(i);
			};
			
		});
		
		rpc.fail(function(){
			// TODO
			p.discard();
		});

		return p;

	}
});

