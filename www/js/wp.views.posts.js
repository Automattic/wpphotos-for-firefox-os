/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";
document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
wp.views.PostsPage = wp.views.Page.extend({
	template_name:"posts",
	
	rendered:false,
	dragging:false,
	
	events:_.extend({
		"click button.add": "showEditor",
		"click button.settings": "showSettings",
		"click button.logo" : "showAbout",
		"click div.blog-title" : "showPicker"
	}),
	
	initialize:function() {
		this.posts = wp.app.posts;
		
		this.listenTo(wp.app, 'currentBlogChanged', this.refresh);
		this.listenTo(this.posts, "selected", this.viewPost);
		this.listenTo(this.posts, "add", this.render);
		this.listenTo(this.posts, "remove", this.render);
				
		if(this.posts.length == 0) {
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
				vScrollbar:false,
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
console.log("dragging stopped")
					var $el = $(el);
					if ($el.hasClass("flip")) {
						$el.removeClass("flip");
						$el.addClass("loading");
						$el.find(".scroll-refresh-label").text(_s("control-loading"));
						self.sync();
					};
				}
			});

			// Need to refresh once we're added to the dom. Since we don't have a good way 
			// to detect that, use a timeer.
			setTimeout(function(){
				self.iscroll.refresh();
			}, 20);
			
		};

		var collection = this.posts;
		var content = this.el.querySelector(".content");
		content.innerHTML = "";
		
		if (wp.app.blogs.length > 1) {
			// Show the blog picker :)
			
			var el = document.createElement("div");
			el.className = "blog-title";
			el.innerHTML = wp.app.currentBlog.get("blogName");
			
			content.appendChild(el);
		};
		
		for(var i = 0; i < collection.length; i++) {
			var post = collection.at(i);
			var view = new wp.views.Post({model:post});
			content.appendChild(view.el);
		};

		this.iscroll.refresh();
		
		return this;
	},
	
	
	showPicker:function(evt) {
		if(evt) {
			evt.stopPropagation();
		};
		
		var html = "<ul>";
		for(var i = 0; i < wp.app.blogs.length; i++) {
			html += '<li data-idx="' + i + '">' + wp.app.blogs.at(i).get("blogName") + "</li>";
		};
		html += "</ul>"
		
		var list = document.createElement('x-select-list');
		list.location = 'middle';
		list.innerHTML = html;
		
		list.addEventListener('select', function(event) {
		try{
			var el = event.target;
			var idx = parseInt(el.getAttribute("data-idx"));
			wp.app.setCurrentBlog(wp.app.blogs.at(idx));
			
			localStorage.publishSetting = parseInt(opt);
			}catch(e){console.log(e)}
		});
		
		list.addEventListener('hide', function(event) {
			list.parentNode.removeChild(list);
		});
		
		document.body.appendChild(list);

	},
	
	viewPost:function(model) {
console.log("--           view post");	
		// if we are not pulling to refresh...
		if(this.dragging) return;
console.log("view post");
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
			caption_str = caption_str.substring(caption_str.lastIndexOf("]") + 1).trim();
			var cap_el = document.createElement("div");
			cap_el.innerHTML = caption_str;
			caption_str = cap_el.textContent;
			
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
			img.src = 'http://i0.wp.com/' + image.link.replace(/.*?:\/\//g, '') + '?resize=320,214';

			if (image.caption.length > 0) {
				caption.innerHTML = image.caption;				
			} else {
				caption.innerHTML = caption_str;
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
