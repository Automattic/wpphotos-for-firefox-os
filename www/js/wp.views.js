/*

	Views require that their templates be loaded in the dom before being called.
	
*/

'use strict';

if(typeof(wp) == "undefined") { var wp = {} };

wp.views = {
	
	templates:{},
	
	registerTemplate:function(template_name, root) {
		this.templates[template_name] = {};
	},
	
	loadTemplates:function() {
	
		var p = wp.promise();
		
		var xhrs = [];
		
		function isFinishedLoading() {
			for (var idx in xhrs) {
				var xhr = xhrs[idx];
				if (!xhr.result) {
					return;
				};
			};
			p.resolve();
		};
		
		function getTemplate(key) {
	 		var url = "templates/" + key + ".html";
	 		
		 	var xhr = wp.XHR.get({"url":url});
		 	xhr.success(function(res) {

				var div = document.createElement("div");
				div.innerHTML = res.response;
				var text = div.querySelector("#template").innerHTML;
				wp.views.templates[key].text = text
				isFinishedLoading();
		 	});
		 	xhr.fail(function(err){
			 	console.log(err);
			 	
			 	isFinishedLoading();
		 	});
			
			return xhr;
		};
		
		for (var key in this.templates) {
		 	xhrs.push(getTemplate(key));
	 	};
		
		return p;
	}
};


wp.views.Page = Backbone.View.extend({
	events: {
		"click button.back" : "goBack"
	},
	
	goBack:function() {
		window.history.back();
	}

});


/* 


*/
wp.views.StartPage = wp.views.Page.extend({
	template_name:"start",
	
	initialize:function() {
		this.render();
	},

	events: {
		"click button.login": "showLogin",
		"click button.createblog": "showCreate"
	},
	
	render:function() {
		// Underscore's templates flag a CSP warning due to their use of "new Function". 
		// The CSP interprets this as "eval like" and risky, so it is denied. 
		// var template = _.template( wp.views.templates[this.template_name].text, {} );
		// For a work around see: 
		// https://github.com/documentcloud/underscore/issues/777
		// This doesn't really work for us since we load the templates from a file soooooo manual it is
		
		var template = wp.views.templates[this.template_name].text;
		// no dom manipulation needed so just render it.
		this.$el.html( template );

		return this;
	},
	
	showLogin:function() {
		wp.app.routes.navigate("login", {trigger:true}); 
	},
	
	showCreate:function() {
		alert("TODO");
	}
	
});
wp.views.registerTemplate("start");


/* 


*/
wp.views.LoginPage = wp.views.Page.extend({
	template_name:"login",
	
	events: {
		"click button.login": "performLogin"
	},
	
	initialize:function() {
		this.render();
	},
	
	render:function() {
		var template = wp.views.templates[this.template_name].text;
		// no dom manipulation needed so just render it.
		this.$el.html( template );

		return this;
	},
	
	performLogin: function() {
		var self = this;
		
		var username = $("#username").val();
		var password = $("#password").val();
		var url = $("#url").val();
		
		// Validation
		
		
		// if all's good. 
		
		var p = wp.models.Blogs.fetchRemoteBlogs(url, username, password);
		
		p.success(function() {
			self.onLoggedIn(p.result());
		});
		
		p.fail(function(){
			alert("Failed");
		});
		
		
	},
	
	// Result is a blogs collection
	onLoggedIn:function(blogs) {
	
		if (blogs.length == 0) {
			// TODO: Nothing there.  Badness.
			return;
		};
		
		if (blogs.length > 1) {
			// TODO: multiple blogs, show a picker.
			return;
		};
		
		var blog = blogs.at(0);
		blog.save();
		wp.app.setCurrentBlog(blog);
		
		var p = wp.models.Posts.fetchRemotePosts();
		p.success(function(result)) {
			wp.app.posts = result;	
		};
		p.always(function() {
			wp.app.routes.navigate("posts", {trigger:true});
		});
		
	}
	
});
wp.views.registerTemplate("login");


/* 


*/
wp.views.PostsPage = Backbone.View.extend({
	template_name:"posts",
	
	initialize:function() {
		this.render();
	},
	
	render:function() {
		var template = wp.views.templates[this.template_name].text;
		
		// update the dom.


		this.$el.html( template );

		return this;
	}
	
});
wp.views.registerTemplate("posts");


/* 


*/
wp.views.EditorPage = Backbone.View.extend({
	template_name:"editor",
	
	initialize:function() {
		this.render();
	},
	
	render:function() {
		var template = wp.views.templates[this.template_name].text;
		// update the dom

		this.$el.html( template );

		return this;
	}
	
});
wp.views.registerTemplate("editor");


