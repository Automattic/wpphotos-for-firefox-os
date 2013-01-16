/*
	wp.api
	
	The library of XML-RPC calls used by the application. All api calls return a wp.XHR instance for chaining callbacks.
	Calls use the XML-RPC WordPress API and not the XML-RPC MetaWeblog API.
	http://codex.wordpress.org/XML-RPC_WordPress_API
	http://codex.wordpress.org/XML-RPC_MetaWeblog_API
	
	Usage: 
		wp.api.setCurerntBlog(blog);
		wp.api.getPosts().success(function).fail(function).always(function);

*/

'use strict';

if(typeof(wp) == "undefined") { var wp = {} };

wp.api = {
	currentBlog:null,
	
	getParams:function(){
		var params = [
			this.currentBlog.blog_id,
			this.currentBlog.username,
			this.currentBlog.password
		];
		for (var i = 0; i < arguments.length; i++) {
			params.push(arguments[i]);
		};
		return params;
	},
	
	getUrl:function() {
		return this.currentBlog.url;
	}, 
	
	setCurrentBlog:function(blog) {
		this.currentBlog = blog;
		
		// TODO: blog changed event?
	}
};


/*
	media: http://codex.wordpress.org/XML-RPC_WordPress_API/Media
	wp.getMediaItem
		int blog_id
	    string username
	    string password
	    int attachment_id 
	    
	wp.uploadFile
		int blogid
	    string username
	    string password
	    struct data
	        string name: Filename.
	        string type: File MIME type.
	        string bits: base64-encoded binary data.
	        bool overwrite: Optional. Overwrite an existing attachment of the same name. (Added in WordPress 2.2) 

		return:	        
			string id (Added in WordPress 3.4)
			string file: Filename.
			string url
			string type

*/
wp.api.getMediaItem = function(attachment_id) {
	var params = wp.api.getParams(attachment_id);
	var rpc = new wp.XMLRPC({"xmlrpcMethod":"wp.getMediaItem", "params":params, "url":wp.api.getUrl()})
	.success(function(){})
	.fail(function(){})
	.always(function(){});
	rpc.execute();
	return rpc;
};
	
wp.api.uploadFile = function(data) {
	var params = wp.api.getParams(data);		
	var rpc = wp.XMLRPC.get({"xmlrpcMethod":"wp.uploadFile", "params":params, "url":wp.api.getUrl()})
	.success(function(){})
	.fail(function(){})
	.always(function(){});
	rpc.execute();
	return rpc;
};

/*
	posts: http://codex.wordpress.org/XML-RPC_WordPress_API/Posts
	wp.getPosts
		int blog_id
		string username
		string password
		struct filter: Optional.	
			string post_type
			string post_status
			int number
			int offset
			string orderby
			string order 
	    
	wp.newPost
		int blog_id
		string username
		string password
		struct content
		
		string post_type
		string post_status
		string post_title
		int post_author
		string post_excerpt
		string post_content
		datetime post_date_gmt | post_date
		string post_format
		string post_name
		string post_password
		string comment_status
		string ping_status
		bool sticky
		int post_thumbnail
		int post_parent
		array custom_fields
		    struct
		        string key
		        string value 
		struct terms: Taxonomy names as keys, array of term IDs as values.
		struct terms_names: Taxonomy names as keys, array of term names as values.
		struct enclosure
		    string url
		    int length
		    string type 

*/

wp.api.getPosts = function(offset) {
	offset = offset || 0;

// TODO: How can we limit what we get back to just a few fields?
	var fields = [
		"guid",
		"link", 
		"post_date",
		"post_date_gmt",
		"post_id",
		"post_name",
		"post_thumbnail",
		"post_title"
	];
	
	var filter = {
		'number':20,
		'offset':offset,
		fields:fields	
	};

	var params = wp.api.getParams(filter);
	var rpc = new wp.XMLRPC({"xmlrpcMethod":"wp.getPosts", "params":params, "url":wp.api.getUrl()})
	.success(function(){})
	.fail(function(){})
	.always(function(){});
	rpc.execute();
	return rpc;
};

wp.api.newPost = function(content) {
	var params = wp.api.getParams(content);
	var rpc = new wp.XMLRPC({"xmlrpcMethod":"wp.newPost", "params":params, "url":wp.api.getUrl()})
	.success(function(){})
	.fail(function(){})
	.always(function(){});
	rpc.execute();
	return rpc;
};


/*
user: http://codex.wordpress.org/XML-RPC_WordPress_API/Users
wp.getUsersBlogs
	string username
    string password 

*/
wp.api.getUsersBlogs = function(url, username, password) {
	var params = [
		username,
		password
	];
	
	var rpc = new wp.XMLRPC({"xmlrpcMethod":"wp.getUsersBlogs", "params":params, "url":url})
	.success(function(){})
	.fail(function(){})
	.always(function(){});
	rpc.execute();
	return rpc;
};


/*
	options: http://codex.wordpress.org/XML-RPC_WordPress_API/Options
	wp.getOptions (featured image supported?)
		int blog_id
		string username
		string password
		array options: List of option names to retrieve. If omitted, all options will be retrieved. 
*/
wp.api.getOptions = function(attachment_id) {
	var params = wp.api.getParams(attachment_id);
	
	var rpc = new wp.XMLRPC({"xmlrpcMethod":"wp.getOptions", "params":params, "url":wp.api.getUrl()})
	.success(function(){})
	.fail(function(){})
	.always(function(){});
	rpc.execute();
	return rpc;
};