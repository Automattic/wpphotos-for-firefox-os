/*

*/

'use strict';

if(typeof(wp) == "undefined") { var wp = {} };

wp.app = {
	currentBlog:null, // model
	posts:null,
	blogs:null,
	routes:null,
	
	init:function() {
console.log("wp.app.run");
		// Clear any location hash so the router doesn't pick it up by mistake. 
		if(location.hash.length > 0) {
			location.href = location.href.substr(0,location.href.indexOf(location.hash));
		};

		this.routes = new wp.Routes();
		Backbone.history.start();

		var q = wp.promiseQueue();
		q.success(function() {
			wp.app.loadBlogs();	
		});

		var p;		
		// Load Templates
		p = wp.views.loadTemplates();
		p.success(function(){

		});
		p.fail(function() {
			// couldn't load templates
		});
		q.add(p);
		
		
		// Open database 
		var p = wp.db.open();
		p.success(function() {
			
		});
		p.fail(function() {
			// couldn't load db
		});
		q.add(p);
	},
	
	
	loadBlogs:function() {
console.log("wp.app.onstart");
		var self = this;

		// load blogs & current blog
		var blogs = new wp.models.Blogs(); // collection
		this.blogs = blogs;
		var p = blogs.fetch();
		p.always(function() {
			// loaded blogs
			self.blogsLoaded();
		});
	},
	
	
	blogsLoaded:function() {
console.log("wp.app.onfetched");
		if (this.blogs.models.length == 0) {
			// no blogs, show start/signup
			// wp.routes....
			console.log('no blogs');
			this.routes.navigate("start", {trigger:true});
			return;
		}

		// check local storage for the key of the current blog. 	
		var blogKey = localStorage.blogKey;
		
		var blog;
		if (blogKey) {
			// if it exists find the current blog in the list of blogs	
			blog = this.blogs.get(blogKey);				
		}
		
		// if it doesn't exist, or the blog can't be found show the first blog in the blogs list and make it current		
		if (!blog) {
			blog = this.blogs.at(0);
		}

		this.setCurrentBlog(blog);

		// Route to the blog's posts page :P
		this.routes.navigate("posts", {trigger:true});
	},
	
	setCurrentBlog:function(blog) {
console.log("wp.app.setCurretnBlog");
console.log(blog);
		wp.api.setCurrentBlog(blog.attributes);
		localStorage["blogKey"] = blog.id;
		this.currentBlog = blog;
	}

};


window.addEventListener("load", function() {
	wp.app.init();
} , false);
