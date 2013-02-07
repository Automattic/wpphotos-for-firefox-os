/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";

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
		
		this.$el.html( template );
		
		// Input tags are missed by the l10n parser so do them manually.
		var username = this.el.querySelector("#username");
		var password = this.el.querySelector("#password");
		var url = this.el.querySelector("#url");

		username.placeholder = _s("control-username-email");
		password.placeholder = _s("control-password");
		url.placeholder = _s("control-blog-address");

		return this;
	},
	
	performLogin:function() {
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
		url = wp.views.normalizeUrl(url);
		
		if(!wp.app.isNetworkAvailable()){
			alert(_s("prompt-network-missing"));
			return;
		};
		
		var p = wp.models.Blogs.fetchRemoteBlogs(url, username, password);
		wp.app.showLoadingIndicator();
		p.success(function() {
			self.onLoggedIn(p.result());
		});
		
		p.fail(function(){
			wp.app.hideLoadingIndicator();
			
			var result = p.result();
			var msg = _s("prompt-problem-logging-in");
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
	},
	
	validateField:function(field) {
		if (field != '')
			return true;
		
		return false;
	},
	
	goBack:function() {
		wp.app.routes.navigate("goBack", {trigger:true});
	},
	
	// Result is a blogs collection
	onLoggedIn:function(blogs) {
	
		if (blogs.length == 0) {			
			alert(_s("prompt-no-blogs"));
			return;
		};
		
		if (blogs.length > 1) {
			// Show the user a list of blogs to choose from
			var selectList = document.createElement('x-select-list');
			selectList.setAttribute('data-fade-duration', '500');
			selectList.setAttribute('data-multi-select', true);
			selectList.innerHTML = '<h1>' + _s('title-select-blogs') + '</h1><ul>';
			for(var i = 0; i < blogs.length; i++) {
				var blog = blogs.at(i);
				selectList.innerHTML += '<li data-blog-id="' + blog.get('blogid') + '">' + blog.get("blogName") + '</li>';
			};
			selectList.innerHTML += '</ul>';
			document.body.appendChild(selectList);

			selectList.addEventListener('hide', function(event) {
				var selectedItems = event.selectedItems;
				var selectedBlogCtr = 0;
				for(var i = 0; i < selectedItems.length; i++) {
					var selectedBlogId = selectedItems[i].getAttribute('data-blog-id');
					var firstBlog;
					
					for(var x = 0; x < blogs.length; x++) {
						var blog = blogs.at(x);
						
						if (selectedBlogId == blog.get('blogid')) {
						
							if (selectedBlogCtr == 0) {
								firstBlog = blog;
							};
							
							blog.save();
							selectedBlogCtr++;
						};
						
					};

					// Set current blog to the first one selected
					if (firstBlog != undefined) {
						wp.app.blogs.fetch();
						
						wp.app.setCurrentBlog(firstBlog);

						if(!wp.app.isNetworkAvailable()) {
							wp.app.routes.navigate("posts", {trigger:true});
							return;
						};
					
						wp.app.showLoadingIndicator();
						var p = wp.models.Posts.fetchRemotePosts();
						p.success(function() {
							wp.app.posts.fetch({where:{index:"blogkey", value:wp.app.currentBlog.id}});
						});
						p.always(function() {
							wp.app.hideLoadingIndicator();
							wp.app.routes.navigate("posts", {trigger:true});
						});

					};
				};
			});
			
			return;
		};
		
		var blog = blogs.at(0);
		var promise = blog.save();
		wp.app.blogs.add(blog);
		wp.app.setCurrentBlog(blog);
		var p = wp.models.Posts.fetchRemotePosts();
		p.success(function() {
			wp.app.posts = p.result();
		});
		p.always(function() {
			wp.app.hideLoadingIndicator();
			wp.app.routes.navigate("posts", {trigger:true});
		});
	}
});
wp.views.registerTemplate("login");
