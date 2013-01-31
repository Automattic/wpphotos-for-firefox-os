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

"use strict";

if(typeof(wp) == "undefined") { var wp = {} };

wp.api = {
	blog:null,  // hash: {username:'', password:'', xmlrpc:'', blog_id:''}
	getParams:function(){
		var blog = this.blog;
		var params = [
			blog.blog_id,
			blog.username,
			blog.password
		];
		for (var i = 0; i < arguments.length; i++) {
			if (arguments[i] == null)  continue;
			
			params.push(arguments[i]);
		};
		return params;
	},
	
	getUrl:function() {
		return this.blog.xmlrpc;
	},
	
	setCurrentBlog:function(blog) {
		// blog.attributes handles backbone objects vs a hash
		this.blog = blog.attributes || blog;
		
		// if the object passed specified a url instead of an xmlrpc property, reassign
		if (!this.blog.xmlrpc && this.blog.url)
			this.blog.xmlrpc = this.blog.url;
		
	}
};


wp.api.build = function(method, params, url) {
	
	var p = wp.promise();
	
	var rpc = new wp.XMLRPC({"xmlrpcMethod":method, "params":params, "url":url});
	rpc.success(function(xhr, event){
		
		if(rpc.fault) {
			p.discard(rpc.result);
			
		} else {
			p.resolve(rpc.result);		
		};
		
	});
	rpc.fail(function(xhr, event){
		p.discard({"status":xhr.status(), "event":event});
	});
	rpc.progress(function(xhr, event){
		p.notify(event);
	});
	rpc.execute();
	return p;
}


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
	return wp.api.build("wp.getUsersBlogs", params, url);
};


/*
	options: http://codex.wordpress.org/XML-RPC_WordPress_API/Options
	wp.getOptions (featured image supported?)
		int blog_id
		string username
		string password
		array options: List of option names to retrieve. If omitted, all options will be retrieved. 
*/
wp.api.getOptions = function(options) {
	var params = this.getParams(options);
	return wp.api.build("wp.getOptions", params, this.getUrl());
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


	wp.getPostFormats
		int blog_id
		string username
		string password
		array filter: Optional.
			bool show-supported 
	
	
	wp.getPostStatusList
		int blog_id
		string username
		string password


*/
wp.api.getPosts = function(offset) {
	offset = Math.floor(offset) || 0;

	var filter = {
		'number':50,
		'offset':offset
	};

	var params = wp.api.getParams(filter);
	return wp.api.build("wp.getPosts", params, this.getUrl());
};

wp.api.newPost = function(content) {
	var params = wp.api.getParams(content);	
	return wp.api.build("wp.newPost", params, this.getUrl());
};

wp.api.getPost = function(post_id) {
	var params = wp.api.getParams(post_id);
	return wp.api.build("wp.getPost", params, this.getUrl());
};

wp.api.getPostFormats = function(filter) {
	var params = wp.api.getParams(filter);
	return wp.api.build("wp.getPostFormats", params, this.getUrl());

};

wp.api.getPostStatusList = function() {
	var params = wp.api.getParams();
	return wp.api.build("wp.getPostStatusList", params, this.getUrl());
};


/*
	media: http://codex.wordpress.org/XML-RPC_WordPress_API/Media
	wp.getMediaLibrary
		int blog_id
	    string username
	    string password
	    struct filter
	    	int number
	    	int offset
	    	parent_id
	    	mime_type
	    
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
wp.api.getMediaLibrary = function(filter) {
	var params = wp.api.getParams(filter);
	return wp.api.build("wp.getMediaLibrary", params, this.getUrl());
}
	
wp.api.uploadFile = function(data) {
	var params = wp.api.getParams(data);
	return wp.api.build("wp.uploadFile", params, this.getUrl());
};
