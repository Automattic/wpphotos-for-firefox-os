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
		wp.app.routes.navigate("goBack", {trigger:true});
	}

});



/* 


*/
wp.views.SettingsPage = wp.views.Page.extend({
	template_name:"settings",
	
	initialize:function() {
		this.render();
	},

	
	render:function() {
		
		var template = wp.views.templates[this.template_name].text;


		this.$el.html( template );

		return this;
	}	
});
wp.views.registerTemplate("settings");


/* 


*/
wp.views.StartPage = wp.views.Page.extend({
	template_name:"start",
	
	initialize:function() {
		this.render();
	},

	events: _.extend({
		"click button.login": "showLogin",
		"click button.createblog": "showCreate"
	}),
	
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
	
	events: _.extend({
		"click button.login": "performLogin",
		"click button.back": "goBack"
	}),
	
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
		if (!this.validateField(username) || !this.validateField(password) || !this.validateField(url)) {
			alert('Please fill out all fields');
			return;
		}
		
		// if all's good. 
		url = this.normalizeUrl(url);
		
		var p = wp.models.Blogs.fetchRemoteBlogs(url, username, password);
		
		p.success(function() {
			self.onLoggedIn(p.result());
		});
		
		p.fail(function(){
			alert("Failed");
		});
		
		
	},
	
	validateField: function(field) {
		if (field != '')
			return true;
		
		return false;
	},
	
	normalizeUrl:function(url) { 
		// make sure it has a protocol
		if(!(/^https?:\/\//i).test(url)) url = 'http://' + url;
		// add the /xmlrpc.php
		if (!(/\/xmlrpc\.php$/i).test(url)) url = url + '/xmlrpc.php';
		
		return url;
	},
	
	goBack:function() {
		wp.app.routes.navigate("goBack", {trigger:true});
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
		p.success(function() {
			wp.app.posts = p.result();
		});
		p.always(function() {
			wp.app.routes.navigate("posts", {trigger:true});
		});
	}
});
wp.views.registerTemplate("login");


/* 


*/
wp.views.AboutPage = wp.views.Page.extend({
	template_name:"about",
	
	initialize:function() {
		this.render();
	},

	
	render:function() {
		
		var template = wp.views.templates[this.template_name].text;

		this.$el.html( template );

		return this;
	}	
});
wp.views.registerTemplate("about");


/* 


*/
wp.views.PostsPage = wp.views.Page.extend({
	template_name:"posts",
	
	events:_.extend({
		"click button.add": "showEditor",
		"click button.settings": "showSettings",
		"click button.logo" : "showAbout"
	}),
	
	initialize:function() {

		var self = this;

		var fetch = false;
		var blog = wp.app.currentBlog;
		var posts;
		if (!wp.app.posts) {
			fetch = true;
			posts = new wp.models.Posts();
			wp.app.posts = posts;
		} else {
			posts = wp.app.posts;
		};
		
		this.posts = posts;
				
		this.listenTo(posts, "add", this.render);
		this.listenTo(posts, "remove", this.render);
		
		if(fetch) {
			var p = posts.fetch({where:{index:"blogkey", value:blog.id}});
			p.success(function() {
				self.render();
			});
			p.fail(function(err) {
				alert(err);
			});
		} else {
			this.render();
		}

	},
	
	render:function() {

		var template = wp.views.templates[this.template_name].text;

		// update the dom.
		this.$el.html( template );
				
		var collection = this.posts;

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
	},

	showAbout:function() {
		wp.app.routes.navigate("about", {trigger:true}); 
	},
	
	showSettings:function() {
		wp.app.routes.navigate("settings", {trigger:true}); 
	}
	
});
wp.views.registerTemplate("posts");


wp.views.Post = Backbone.View.extend({
	model:null, 
	
	template_name:"post",
	
	events: _.extend({
		"click div.post-body": "showPost",
		"click div.photo": "showPost",
		"click button.upload": "upload"
	}),
	
	initialize:function(options) {
		this.model = options.model;
		
		// TODO: Listen to progress events on the model. 
		this.listenTo(this.model, 'progress', this.render);
		
		this.render();
	},
	
	render:function(progress) {

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
		var postDateGmt = this.model.get("post_date_gmt");
		date.innerHTML = this.formatGMTDate(postDateGmt);

		var content = div.querySelector(".post-body p");
				
		var ele = document.createElement("div");
		ele.innerHTML = this.model.get("post_content");

		var str = ele.textContent;
		
		if(str.indexOf("[/caption]") != -1) {
			var pos = str.indexOf("[/caption]") + 10;
			str = str.substr(pos);
		};
		
		if (str.length > 160) {
			str = str.substr(0, 160);
			str = str.substr(0, str.lastIndexOf(" "));
			str = str + " [...]";
		};

		content.innerHTML = str;

		//if local draft
		var mask = div.querySelector(".upload-mask");
		if (this.model.isLocalDraft() || this.model.isSyncing()) {
			$(mask).removeClass("hidden");
			
			var progressDiv = div.querySelector(".progress");
			var buttonDiv = div.querySelector("div.upload");
			
			if(this.model.isSyncing()) {
				// If we're syncing show progress.
				$(buttonDiv).addClass("hidden");
				$(progressDiv).removeClass("hidden");
				
				if(progress) {				
					var el = div.querySelector(".progress span");
					
					var progressStr = progress.status;
					if(progress.percent ) {
						progressStr += (" " + progress.percent + "%");
					}
					el.innerHTML = progressStr;
				};
				
			} else {
				// Else show the upload button.
				$(progressDiv).addClass("hidden");
				$(buttonDiv).removeClass("hidden");
			};
			
		} else {
			$(mask).addClass("hidden");
		};

		this.$el.html(div.querySelector("div"));
	
		return this;
	},
	
	formatGMTDate:function(date) {
		// Fix the gmt time.
		var gmt = new Date();
		var offset = date.getTimezoneOffset() * 60000;
		gmt = new Date(gmt.valueOf() + offset);
				
		var diff = gmt - date.valueOf();
		
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
	},
	
	upload:function() {
		
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
			};
			
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
			
		} catch(e) {
			// Checking typeof(MozActivity) in a browser throws an exception in some versions of Firefox. 
			// just pass thru.
			return; 
		};
	},
	
	events:_.extend({
		"click button.save": "save",
		"click button.back": "goBack"
	}),
	
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
	
	save:function() {
		
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
		
		var attrs = {
			"blogkey":wp.app.currentBlog.id,
			"post_title":title.value,
			"post_content":content.value
		};

		var post = new wp.models.Post(attrs);
		
		// Save a local draft or sync to the server?
		var p;
		if(confirm("Tap OK to publish now, or cancel to publish later")) {
			p = post.uploadAndSave(image_data, caption.value); // saves
		} else {
			
			p = post.save();
		};
		
		wp.app.posts.add(post, {at:0});
		wp.app.routes.navigate("posts", {trigger:true});
		return p;
	},
	
	goBack:function() {
		if(confirm("Cancel editing?")) {
			wp.app.routes.navigate("posts", {trigger:true});
		};
	}
	
});
wp.views.registerTemplate("editor");


