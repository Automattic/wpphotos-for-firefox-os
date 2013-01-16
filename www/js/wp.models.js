/*
	Models
	
	The app defines the following models:
		blog
		option
		post
		media
	
	See each model for details. 		

*/

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
'use strict';

if(typeof(wp) == "undefined") { var wp = {} };
if(typeof(wp.models) == "undefined") { var wp.models = {} };

wp.models.Media = Backbone.Model.extend({

	defaults: {
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
	
	defaults:{
		post_id:"",
		post_title:"",
		post_date_gmt:null,
		post_date:null,
		post_status:"",
		post_link:"",
		post_thumbnail:null		
	},
	
	initialize:function() {
		
	}

}, {});


/*
	options: http://codex.wordpress.org/XML-RPC_WordPress_API/Options

    string desc
    string value
    bool readonly 

	options: http://codex.wordpress.org/XML-RPC_WordPress_API/Options
	wp.getOptions (featured image supported?)
		int blog_id
		string username
		string password
		array options: List of option names to retrieve. If omitted, all options will be retrieved. 
*/
wp.models.Option = Backbone.Model.extend({

	defaults: {
		blogid:"",
		desc:"",
		value:""		
	},
	
	initialize:function() {
		
	}
}, {});


/*
	user: http://codex.wordpress.org/XML-RPC_WordPress_API/Users
	wp.getUsersBlogs
		string username
	    string password 

*/
wp.models.Blog = Backbone.Model.extend({

	defaults:{
		username:"",
		password:"",
		blogid:"",
		blogName:"",
		url:"",
		xmlrpc:""
	},
	
	initialize:function(){
		
	}
}, {});


