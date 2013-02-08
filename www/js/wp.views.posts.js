/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";
document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
wp.views.PostsPage = wp.views.Page.extend({
	template_name:"posts",
	
	syncedonce:false, // Have we tried to sync at least once?
	
	syncing:false,
	
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
		
		this.listenTo(wp.app, 'currentBlogChanged', this.onBlogChanged);
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

		// Ensure that no loading spinner is showing
		wp.app.hideLoadingIndicator();
		
		if(!this.rendered) {
			this.rendered = true;

			var template = wp.views.templates[this.template_name].text;
	
			// update the dom.
			this.$el.html( template );
						
			var el = this.$el.find(".scroll")[0];

			var self = this;
			var refreshOffset = 30;
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
					if ($el.hasClass("pulling")) $el.removeClass("pulling");
					if ($el.hasClass("loading")){
						$el.removeClass("loading");
						$el.find(".scroll-refresh-label").text(_s("control-pull-to-refresh"));
					};
				},
				onScrollMove: function () {
					self.dragging = true;
					var $el = $(el);
					$el.addClass("pulling");
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
					$el.removeClass("pulling");
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
			
			var pel = document.createElement("div");
			pel.className = "blog-title";
			pel.innerHTML = wp.app.currentBlog.get("blogName");
			
			content.appendChild(pel);
		};
		
		for(var i = 0; i < collection.length; i++) {
			var post = collection.at(i);
			var view = new wp.views.Post({model:post});
			content.appendChild(view.el);
		};

		this.iscroll.refresh();
		
		return this;
	},
	
	onBlogChanged:function() {
		this.syncedonce = false;
		this.refresh();
	},
	
	showPicker:function(evt) {
		if(evt) {
			evt.stopPropagation();
		};
		
		var html = "<h1>" + _s("title-blogs") + "</h1><ul>";
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
			}catch(e){console.log(e)}
		});
		
		list.addEventListener('hide', function(event) {
			list.parentNode.removeChild(list);
		});
		
		document.body.appendChild(list);

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
					
			if(self.posts.length == 0 && !self.syncedonce) {
				// If we haven't tried to sync at least once, do so. 
				if(self.syncing) {
					return; 
				};
				
				wp.app.showLoadingIndicator();
				var promise = self.sync();
				promise.always(function(){
					wp.app.hideLoadingIndicator();
				});
			};

		});
		p.fail(function(err) {
			// TODO:
			alert(err);
		});
		
		return p;
	},
	
	sync:function() {

		if(!wp.app.isNetworkAvailable()) {
			alert(_s('prompt-network-missing'));
			self.iscroll.refresh();
			return;
		};
		
		this.syncing = true;
		var self = this;
		var p = wp.models.Posts.fetchRemotePosts();
		p.success(function() {
			self.syncedonce = true;
			self.refresh();
		});
		p.fail(function() {
			var result = p.result();
			var msg = _s("prompt-problem-syncing");
			if (result.status == 0 && result.readyState == 0) {
				msg = _s("prompt-bad-url");
			} else if(result.faultCode){
				if (result.faultCode == 403) {
					msg = _s("prompt-bad-username-password");
				} else {
					msg = result.faultString;
				};
			};
			alert(_s(msg));

		});
		p.always(function(){
			self.syncing = false;
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
		
		var postTitle = this.model.get("post_title");
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
		
		// Hide content (paragraph) if there is none
		if (str.length == 0) {
			content.className = "hidden";
		}
		
/*
		var postDateGmt = this.model.get("post_date_gmt");
		var formattedDate = this.formatGMTDate(postDateGmt);
*/
		var formattedDate = this.formatGMTDate(this.model.get("local_date"));

		if (postTitle.length == 0 && str.length == 0) {
			var postBody = div.querySelector(".post-body");
			postBody.className += " hidden";
			var noTitleDate = div.querySelector(".no-title-date");
			noTitleDate.innerHTML = formattedDate;
		}
		
		else {
			var title = div.querySelector(".post-body h3");
			title.innerHTML = this.model.get("post_title");
			
			// Hide Title if there is none
			if (postTitle.length == 0) {
				title.className += " hidden";
			}

			var date = div.querySelector(".post-body span");
			date.innerHTML = formattedDate;

			content.innerHTML = str;
		};

		var img = div.querySelector(".photo img");
		var caption = div.querySelector(".caption");
		
		var image = this.model.image();
		if(image && image.link) {
			if(image.link.indexOf("data:image") == 0) {
				// data url so don't use photon.
				img.src = image.link;
			} else {
				img.src = 'http://i0.wp.com/' + image.link.replace(/.*?:\/\//g, '') + '?resize=320,214';
			};

			if (image.caption != undefined && image.caption.length > 0) {
				caption.innerHTML = image.caption;				
			} else {
				caption.innerHTML = caption_str;
			};

		} else {
			img.src = "";
			// Hide image and caption if there is no image
			var photo = div.querySelector(".photo");
			photo.className += " hidden";
			caption.className += " hidden";
			
			// Enable no-image styling for posts
			var postBody = div.querySelector(".post-body");
			postBody.className += " noimage";
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
				
				var el = div.querySelector(".progress span");
				var progressStr = this.model.sync_status;
				if(progress) {
					progressStr = progress.status;
/*
					if(progress.percent ) {
						progressStr += (" " + progress.percent + "%");
					}
*/
				};
				el.innerHTML = progressStr;
				
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
/*
		var gmt = new Date();
		var offset = date.getTimezoneOffset() * 60000;
		gmt = new Date(gmt.valueOf() + offset);
				
		var diff = gmt - date.valueOf();
*/
		var diff = Date.now() - date.valueOf();
				
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
