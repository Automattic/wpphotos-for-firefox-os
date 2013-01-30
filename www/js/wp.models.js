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

		var rpc = wp.api.getOptions(ops);
		rpc.success(function(result) {
			self.set("options", result);
			self.save();
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
		
		rpc.success(function(result){
			console.log("blogs rpc success");
			try {
				var res = rpc.result;
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
	idAttribute:"post_link",
	defaults:{
		blogkey:"",
		post_id:"",
		post_title:"",
		post_date_gmt:null,
		post_date:null,
		post_status:"",
		link:"",
		post_thumbnail:null,
		photo:null, // Saved item from wp.getMediaLibrary
		pending_photo:null // image data awaiting upload
	},
	
	isLocalDraft:function(){
		return (this.get("link").indexOf("http") == -1);
	},
	
	parse:function(attr) {
		
		if(attr["post_thumbnail"] instanceof Array && attr["post_thumbnail"].length == 0) {
			attr["post_thumbnail"] = null;
		};
		
		return attr;
	},
	
	setPendingPhoto:function(data, caption) {
		caption = caption || null;
		var obj = {
			data:data,
			caption:caption
		};
		this.set({'pending_photo':obj});
		return this.save();
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
		
		rpc.success(function(res){
			var res = rpc.result;
			
			if ((res instanceof Array) && (res.length > 0)){
				self.set({media:res[0]});
			};
			
			var p1 = self.save();
			p1.success(function(){
				p.resolve();
			});
		});
		
		return p;
	},
	
	saveRemote:function(){
		var self = this;
		var content = this.toJSON();
		delete content.blogkey; // No need to send up blogkey.
		
		var p = wp.promise();
		
		var rpc = wp.api.newPost(content);
		
		rpc.success(function(xhr) {
			var post_id = rpc.result;
		
			// Since we only get the post ID back from a save make a request
			// for the full post content.
			var rpc = wp.api.getPost(post_id);
			rpc.success(function(xhr) {
				
				var res = rpc.result;
				self.set(res); // update all attributes.
				self.save();
				
				p.resolve(self);
			});

		});
		
		return p;
	},
	
	image:function(){
		return this.get("pending_photo") || this.get("post_thumbnail") || this.get("photo");
	},
	
	
	uploadPhoto:function() {
		var pending_photo = this.get("pending_photo");
		if(!pending_photo) return;
		
		var filename = "image_"+ Date.now() + ".png";
		
		var data = pending_photo.link.slice(",")[1]; // Grab the data portion of the dataurl.
		var bits = new wp.XMLRPC.Base64(data, false);

		var data = {
			"name":filename,
			"type":"image/png",
			"bits":bits
		};
		
		var self = this;
		var rpc = wp.api.uploadFile(data);
		rpc.success(function(res) {
			console.log(rpc.result);
			
			var result = rpc.result; // Should be the attachment
			var url = result.url;
			var content = this.get("post_content");

			content = "<a href=" + url + "><img src=" + url + " /></a><br><br>" + content;
			
			// Update content adn clear the pending_photo.
			self.set({post_content:content, pending_photo:null});
			var p = this.save();
			p.success(function() {
				self.saveRemote();
			});
			
			return p;
		});
		rpc.fail(function(res) {
			console.log("Upload Failed");
		});
		
		return rpc;
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
	model:wp.models.Post
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
		
		var rpc = wp.api.getPosts(offset)
		rpc.success(function(result){
			var res = rpc.result;
			
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

					});

					p.fail(function(){

					});

					// Add the save promise to the promise queue.
					q.add(p);

				})(i);
			};
			
		});
		
		rpc.fail(function(){
			p.discard();
		});

		return p;

	}
});

