/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";

/*
	Convenience method for localizing strings in code. Pass the identifier of the sting in the localization files.
	Supports variables in strings. 
	For more info on webL10n localization see: https://github.com/fabi1cazenave/webL10n
	
	Usage:
		Assuming localization strings are defined as follows:
			welcome = Welcome!
			welcome-user = Welcome {{user}}!

		Then you can translate them like so: 
			_s('welcome');
			_s('welcome-user', { user: "John" });
*/
var _s = function(text) {
	try {
		if(navigator && navigator.mozL10n) {
			return navigator.mozL10n.get.apply(null, arguments) || text;
		};
	} catch(ignore) {}
	return text;
};


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
				
				// Translate locales.
				if(navigator && navigator.mozL10n) {
					navigator.mozL10n.translate(div);
				};
				
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
	
	publish_settings_options: [
		"Always Ask",
		"Publish Immediately",
		"Publish Later"
	],
	
	initialize:function() {
		this.render();
	},

	events: _.extend({
		"click button.back" : "goBack",
		"click #settings-add" : "addBlog",
		"click #settings-create" : "createBlog",
		"click #settings-publish-settings": "publishSettings",
		"click #settings-about":"about",
		"click #settings-reset":"reset"
	}),
	
	render:function() {
		
		var template = wp.views.templates[this.template_name].text;
		this.$el.html( template );
try {
		// blogs!!!
		var ul = this.el.querySelector(".bloglist ul");
		for(var i = 0; i < wp.app.blogs.length; i++) {
			var blog = new wp.views.BlogItemView({model:wp.app.blogs.at(i)});
			ul.appendChild(blog.el);
		};
} catch(e){
	console.log(e);
}
		var pubSetting = localStorage.publishSetting || 0;
		this.el.querySelector("#settings-publish-settings").innerHTML = _s(this.publish_settings_options[pubSetting]);
		
		return this;
	},
	
	addBlog:function() {
		wp.app.routes.navigate("login", {trigger:true});
	},
	
	createBlog:function() {
		window.open("https://signup.wordpress.com/signup/", "", "resizable=yes,scrollbars=yes,status=yes");
	},
	
	publishSettings:function(evt) {
		evt.stopPropagation();
		
		var self = this;
	
		var arr = this.publish_settings_options;
		
		var html = "<h3>" + _s("Publish Settings") + "</h3><ul>";
		for(var idx in arr) {
			html += '<li data-opt="' + idx + '">' + _s(arr[idx]) + "</li>";
		};
		html += "</ul>"
		
		var list = document.createElement('x-select-list');
		list.location = 'middle';
		list.innerHTML = html;
			
		list.addEventListener('select', function(event) {
		try{
			var el = event.target;
			var opt = el.getAttribute("data-opt");
			localStorage.publishSetting = parseInt(opt);
			}catch(e){console.log(e)}
		});
		
		list.addEventListener('hide', function(event) {
			list.parentNode.removeChild(list);
			self.render();
		});
		
		document.body.appendChild(list);
	},
	
	about:function() {
		wp.app.routes.navigate("about", {trigger:true});
	},
	
	reset:function() {
		// Reset the app. Deletes local storage and indexeddb.
		if(confirm("This will remove all data in the app.  Are you sure?")) {
			delete localStorage.blogKey;
			delete localStorage.publishSetting;
			
			return;
			
			var p = wp.db.drop();
			p.success(function(){
				console.log("RESET SUCCESS");
			})
			p.fail(function(){
				console.log("RESET FAIL");
			})
			p.always(function(){
				wp.app.init();
			});
		};
	}
	
});
wp.views.registerTemplate("settings");



wp.views.BlogItemView = Backbone.View.extend({
	model:null, 
	
	template_name:"settings-blog-item",
	
	events: _.extend({
		"click span:first-child":"edit",
		"click button":"del"
	}),
	
	initialize:function(options) {
		this.model = options.model;
		
		this.render();
	},
	
	render:function() {

		var ul = document.createElement("ul");
		ul.innerHTML = wp.views.templates[this.template_name].text;
console.log(ul);

		//<li><span>Blog name </span><span><button>X</button></span></li>
		var span = ul.querySelector("span");
		
		span.innerHTML = this.model.get("blogName");
		
		this.$el.html(ul.querySelector("li"));
	
		return this;
	},
	
	edit:function(evt) {
		evt.stopPropagation();
		alert("edit")
	},
	
	del:function(evt) {
		evt.stopPropagation();
		alert("del")
	}
	
});
wp.views.registerTemplate("settings-blog-item");


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
			alert(_s('prompt-fill-out-all-fields'));
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

	events:_.extend({
		"click button.back" : "goBack",
		"click button#tos": "showTos",
		"click button#privacy": "showPrivacy"
	}),
	
	render:function() {
		
		var template = wp.views.templates[this.template_name].text;

		this.$el.html( template );

		return this;
	},
	
	showTos:function() {
		window.open("http://wordpress.com/tos/", "", "resizable=yes,scrollbars=yes,status=yes");
	},
	
	showPrivacy:function() {
		window.open("http://automattic.com/privacy/", "", "resizable=yes,scrollbars=yes,status=yes");
	}
});
wp.views.registerTemplate("about");


/* 


*/
wp.views.PostsPage = wp.views.Page.extend({
	template_name:"posts",
	
	rendered:false,
	dragging:false,
	
	events:_.extend({
		"click button.add": "showEditor",
		"click button.settings": "showSettings",
		"click button.logo" : "showAbout"
	}),
	
	initialize:function() {

		var self = this;

		var refresh = false;
		var blog = wp.app.currentBlog;
		var posts;
		if (!wp.app.posts) {
			refresh = true;
			posts = new wp.models.Posts();
			wp.app.posts = posts;
		} else {
			posts = wp.app.posts;
		};
		
		this.posts = posts;

		this.listenTo(posts, "selected", this.viewPost);
		this.listenTo(posts, "add", this.render);
		this.listenTo(posts, "remove", this.render);
		
		if(refresh) {
			this.refresh();
		} else {
			this.render();
		};

	},
	
	render:function() {

		if(!this.rendered) {
			this.rendered = true;

			var template = wp.views.templates[this.template_name].text;
	
			// update the dom.
			this.$el.html( template );
						
			var el = this.$el.find(".scroll")[0];

			var self = this;
			var refreshOffset = 50;
			this.iscroll = new iScroll(el, {
				useTransition: true,
				hScroll:false,
				vScroll:true,
				hScrollbar:false,
				vScrollbar:true,
				fixedScrollbar:true,
				fadeScrollbar:false,
				hideScrollbar:false,
				bounce:true,
				momentum:true,
				lockDirection:true,
				topOffset: refreshOffset,
				onRefresh: function () {
					var $el = $(el);
					if ($el.hasClass("loading")){
						$el.removeClass("loading");
						$el.find("scroll-refresh-label").text(_s("control-pull-to-refresh"));
					};
				},
				onScrollMove: function () {
					self.dragging = true;
					var $el = $(el);
					if (this.y > 5 && !$el.hasClass("flip")){
						$el.addClass("flip");
						$el.find(".scroll-refresh-label").text(_s("control-release-to-refresh"));
						this.minScrollY = 0;
					} else if (this.y < 5 && $el.hasClass("flip")) {
						$el.removeClass("flip");
						$el.find(".scroll-refresh-label").text(_s("control-pull-to-refresh"));
						this.minScrollY = -refreshOffset;
					};
				},
				onScrollEnd: function () {
					self.dragging = false;
					var $el = $(el);
					if ($el.hasClass("flip")) {
						$el.removeClass("flip");
						$el.addClass("loading");
						$el.find(".scroll-refresh-label").text(_s("control-loading"));
						self.sync();
					};
				}
			});
		}

		var collection = this.posts;
		var content = this.el.querySelector(".content");
		content.innerHTML = "";
		for(var i = 0; i < collection.length; i++) {
			var post = collection.at(i);
			var view = new wp.views.Post({model:post});
			content.appendChild(view.el);
		};
	
		return this;
	},
	
	viewPost:function(model) {
	
		// if we are not pulling to refresh...
		if(this.dragging) return;
		
		window.open(model.get("link"), "", "resizable=yes,scrollbars=yes,status=yes");
		
	},
	
	refresh:function() {

		var self = this;
		var p = this.posts.fetch({where:{index:"blogkey", value:wp.app.currentBlog.id}});
		p.success(function() {
			self.render();
		});
		p.fail(function(err) {
			// TODO:
			alert(err);
		});
		
		return p;
	},
	
	sync:function() {

		var self = this;
		var p = wp.models.Posts.fetchRemotePosts();
		p.success(function() {
			self.iscroll.refresh();
			self.refresh();
		});
		p.fail(function() {
			// TODO:
			self.iscroll.refresh();
		});

		return p;
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
		"click button.upload": "upload",
		"click button.discard": "discard"
	}),
	
	initialize:function(options) {
		this.model = options.model;
		
		this.listenTo(this.model, 'progress', this.render);
		this.listenTo(this.model, "destroy", this.remove);
		this.render();
	},
	
	render:function(progress) {

		var div = document.createElement("div");
		div.innerHTML = wp.views.templates[this.template_name].text; 
		
		var title = div.querySelector(".post-body h3");
		title.innerHTML = this.model.get("post_title");

		var date = div.querySelector(".post-body span");
		var postDateGmt = this.model.get("post_date_gmt");
		date.innerHTML = this.formatGMTDate(postDateGmt);

		var content = div.querySelector(".post-body p");

		var ele = document.createElement("div");
		ele.innerHTML = this.model.get("post_content");

		var caption_str = "";
		var str = ele.textContent;
		if(str.indexOf("[/caption]") != -1) {
			var pos = str.indexOf("[/caption]") + 10;
			
			caption_str = str.substring(0, str.indexOf("[/caption]"));
			caption_str = caption_str.substring(caption_str.lastIndexOf(">")).trim();
			
			str = str.substr(pos);
		};
		
		if (str.length > 160) {
			str = str.substr(0, 160);
			str = str.substr(0, str.lastIndexOf(" "));
			str = str + " [...]";
		};

		content.innerHTML = str;

		var img = div.querySelector(".photo img");
		var caption = div.querySelector(".caption");
		
		var image = this.model.image();
		if(image) {
			img.src = image.link;
			
			if (image.caption.length > 0) {
				caption.innerHTML = image.caption;				
			} else {
				caption.innerHTML - caption_str;
			};

		} else {
			img.src = "";
			caption.innerHTML = "No Photo";
		};
		

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
	
	showPost:function(evt) {
		if (this.model.isLocalDraft()) {
			return;
		};
		this.model.collection.trigger("selected", this.model);
//		window.open(this.model.get("link"), "", "resizable=yes,scrollbars=yes,status=yes");
	},
	
	upload:function() {
		this.model.uploadAndSave();		
	},
	
	discard:function(){
		if(confirm(_s("prompt-discard-post?"))){
			this.model.destroy();
		};
	},
	
});
wp.views.registerTemplate("post");


/* 


*/
wp.views.EditorPage = wp.views.Page.extend({
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
		
		// webLi0n doesn't pickup placeholders on inputs so we need to do this manually
		this.el.querySelector("#caption").placeholder = _s("control-caption");

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
			"post_title":title.value.trim(),
			"post_content":content.value.trim()
		};

		if (tags.value.trim().length > 0){
			attrs["terms_names"] = {"post_tag":tags.value.trim().split(",")};
		};
		
		var post = new wp.models.Post(attrs);
		
		// Save a local draft or sync to the server?
		var p;
		
		var publishSetting = localStorage.publishSetting || 0;		
		
		switch(publishSetting) {
			
			case 0: //prompt
				
				if(confirm(_s("prompt-publish-now"))) {
					p = post.uploadAndSave(image_data, caption.value.trim()); // saves
				} else {
					post.setPendingPhoto(image_data, caption.value.trim());
					p = post.save();
				};
				
				break;
			case 1: // publish now
				
				p = post.uploadAndSave(image_data, caption.value.trim()); // saves
									
				break;
			case 2: // publish later

				post.setPendingPhoto(image_data, caption.value.trim());
				p = post.save();

				break;
		};
		
		wp.app.posts.add(post, {at:0});
		wp.app.routes.navigate("posts", {trigger:true});
		return p;
	},
	
	goBack:function() {
		if(confirm(_s("prompt-cancel-editing?"))) {
			wp.app.routes.navigate("posts", {trigger:true});
		};
	}
	
});
wp.views.registerTemplate("editor");
