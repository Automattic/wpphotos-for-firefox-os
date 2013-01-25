/*
	Models
	
	The app defines the following models:
		blog
		option
		post
		media
	
	See each model for details. 		

*/

'use strict';

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
		var rpc = wp.api.getOptions(self.get("blogid"));
		rpc.success(function(result) {
			self.set("options", result);
			self.save();
		});
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
		post_link:"",
		post_thumbnail:null		
	},
	
	initialize:function() {
		
	},
	
	saveRemote:function(){
		var self = this;
		var content = this.toJSON();
		delete content.blogkey; // No need to send up blogkey.
		
		var p = wp.promise();
		
		var rpc = wp.api.newPost(content);
		
		rpc.success(function(res) {
			self.set("post_id", rpc.result);
			self.save();
		});
		
		return p;
	}

}, {

});

wp.models.Posts = Backbone.Collection.extend({
	store:"posts",
	model:wp.models.Post
}, {

	fetchRemotePosts:function(offset) {
	
		var p = wp.promise();
		var rpc = wp.api.getPosts(offset)
		
		rpc.success(function(){
			var res = rpc.result;
			var collection = new wp.models.Posts(res);
			var blog = wp.app.currentBlog;
			for( var idx in collection.models) {
				var model = collection.models[idx];
				model.set("blogkey", blog.id);
				model.save();
			};
			p.resolve(collection);
		});
		
		rpc.fail(function(){
			p.discard();
		});

		return p;
	}

});


/*
	media: http://codex.wordpress.org/XML-RPC_WordPress_API/Media
    
    datetime date_created_gmt
    string parent: ID of the parent post.
    string link
    string thumbnail
    string title
    string caption
    string description
    string metadata
    string attachment_id (Added in WordPress 3.4)
    
*/

wp.models.Media = Backbone.Model.extend({
	store:"media",
	idAttribute:"link",
	defaults: {
		blogkey:"",
		postkey:"",
		date_created_gmt:null,
		parent:"",
		link:"",
		thumbnail:"",
		title:"",
		caption:"",
		description:"",
		metadata:"",
		attachment_id:""
	},

	initialize:function() {
		
	}

}, {});

wp.models.Medias = Backbone.Collection.extend({
	store:"media",
	model:wp.models.Media
});
