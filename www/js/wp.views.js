/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";

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
	className:"page",
	
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
		window.open("https://signup.wordpress.com/signup/", "", "resizable=yes,scrollbars=yes,status=yes");
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
		var promise = blog.save();
		wp.app.setCurrentBlog(blog);

		var p = wp.models.Posts.fetchRemotePosts();
		p.success(function(result) {
			wp.app.posts = result;
		});
		p.always(function() {
			wp.app.routes.navigate("posts", {trigger:true});
		});

	}
});
wp.views.registerTemplate("login");


/* 


*/
wp.views.PostsPage = wp.views.Page.extend({
	template_name:"posts",
	
	events:{
		"click button.add": "showEditor"
	},
	
	initialize:function() {
try {
		var self = this;
		
		var blog = wp.app.currentBlog;
		var posts = new wp.models.Posts();
		var p = posts.fetch({where:{index:"blogkey", value:blog.id}});
		p.success(function(result) {
			wp.app.posts = posts;
			self.render();
		});
		p.fail(function(err) {
			alert(err);
		});
} catch(e) {
	console.log(e);
}
	},
	
	render:function() {
		var template = wp.views.templates[this.template_name].text;

		// update the dom.
		this.$el.html( template );
				
		var collection = wp.app.posts;

		var content = this.el.querySelector(".content");
		for(var i = 0; i < collection.length; i++) {
			var post = collection.at(i);
			var view = new wp.views.Post({model:post});
			content.appendChild(view.el);
		};
		return this;
	},
	
	showEditor:function() {
		wp.app.routes.navigate("editor", {trigger:true}); 
	}
	
});
wp.views.registerTemplate("posts");


wp.views.Post = Backbone.View.extend({
	model:null, 
	
	template_name:"post",
	
	events: {
		"click div.post": "showPost"
	},
	
	initialize:function(options) {
		this.model = options.model;
		this.render();
	},
	
	render:function() {

		var div = document.createElement("div");
		div.innerHTML = wp.views.templates[this.template_name].text; 

		var img = div.querySelector(".photo img");
		var caption = div.querySelector(".caption");
		
		var image = this.model.image();
		if(image) {
			img.src = image.link;
			caption.innerHTML = image.caption;
		} else {
			img.src = "";
			caption.innerHTML = "No Photo";
		};
		
		var title = div.querySelector(".post-body h3");
		title.innerHTML = this.model.get("post_title");

		var date = div.querySelector(".post-body span");
		var postDate = this.model.get("post_date");
		date.innerHTML = this.formatDate(postDate);

		var content = div.querySelector(".post-body p");
				
		var ele = document.createElement("div");
		ele.innerHTML = this.model.get("post_content");
						
		var str = ele.textContent;
		str = str.substr(0, 160);
		str = str.substr(0, str.lastIndexOf(" "));
		str = str + " [...]";
		content.innerHTML = str;

		this.$el.html(div.querySelector("div"));

		return this;
	},
	
	formatDate:function(date) {
		var diff = Date.now() - date.getTime();
		var d = "";
		if (diff < 60000) {
		    // seconds
		    d = Math.floor(diff / 1000) + "s";
		} else if (diff < 3600000) {
		    // minutes
		    d = Math.floor(diff / 60000) + "m";
		} else if (diff < 86400000) {
		    // hours
		    d = Math.floor(diff / 3600000) + "h";
		} else {
		    // days 
		    d = Math.floor(diff / 86400000) + "d";
		};
		return d;
	},
	
	showPost:function() {
		// If this is a draft ...
		
		
		// If this is published ...
		window.open(this.model.get("link"), "", "resizable=yes,scrollbars=yes,status=yes");
	}
	
});
wp.views.registerTemplate("post");


/* 


*/
wp.views.EditorPage = Backbone.View.extend({
	template_name:"editor",
	
	initialize:function() {
		this.render();
		
		// This is where we need to launch the mozactivity for the picker.
		try {
			if(typeof(MozActivity) == "undefined") {
				return;
			}
		} catch(e) {
			// Checking typeof(MozActivity) in a browser throws an exception in some versions of Firefox. 
			// just pass thru.
			return; 
		}

		var self = this;
		// Start a Moz picker activity for the user to select an image to upload
		// either from the gallery or the camera. 
		var activity = new MozActivity({
			name: 'pick',
			data: {
				type: 'image/jpeg'
			}
		});
				
		activity.onsuccess = function() {
			self.onImageSelected(activity.result.blob);
		};

		activity.onerror = function() {
			//TODO
		};
	},
	
	events:{
		"click button.save": "saveDraft"
	},
	
	render:function() {
		var template = wp.views.templates[this.template_name].text;
		// update the dom

		this.$el.html( template );

		return this;
	},
	
	onImageSelected:function(blob) {
		var img = this.el.querySelector("#photo");
		img.src = URL.createObjectURL(blob);
	},
	
	saveDraft:function() {
		// save a local draft, store the image data on the post. 
		// We'll try to upload the image when we have connectivity.
		
		var img = this.el.querySelector("#photo");
		var caption = this.el.querySelector("#caption");
		var title = this.el.querySelector("#post-title");
		var content = this.el.querySelector("#post-content");
		var tags = this.el.querySelector("#post-tags");
		
		var canvas = this.el.querySelector("#photo-canvas");
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
	
		var image_data = canvas.toDataURL("image/png", 0.80);
		image_data = image_data.split(',')[1]; // trim off the data url prefix
		
		var attrs = {
			"blogkey":wp.app.currentBlog.id,
			"post_title":title.value,
			"post_content":content.value
		};

		var post = new wp.models.Post(attrs);
		var p = post.setPendingPhoto(image_data, caption.value); // saves		

		p.success(function(){
			wp.routes.navigate("posts");
		});

		wp.app.posts.add(post, {at:0});
	}
	
});
wp.views.registerTemplate("editor");


