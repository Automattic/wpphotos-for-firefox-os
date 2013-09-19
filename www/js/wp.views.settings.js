/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";

wp.views.SettingsPage = wp.views.Page.extend({
	template_name:"settings",
	
	publish_settings_options: [
		"label-always-ask",
		"label-publish-immediately",
		"label-publish-later"
	],
	
	initialize:function() {
	
		this.listenTo(wp.app.blogs, "add", this.render);
		this.listenTo(wp.app.blogs, "remove", this.blogRemoved);
		this.listenTo(wp.app, "currentBlogChanged", this.render);
		this.listenTo(wp.app, "publishSettingsChanged", this.render);
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

		var ul = this.el.querySelector(".bloglist ul");
		for(var i = 0; i < wp.app.blogs.length; i++) {
			var blog = new wp.views.BlogItemView({model:wp.app.blogs.at(i)});
			ul.appendChild(blog.el);
			blog.el.className = "list-button";
		};

		var pubSetting = localStorage.publishSetting || 0;
		this.el.querySelector("#settings-publish-settings").innerHTML = _s(this.publish_settings_options[pubSetting]);
		
		this.el.querySelector("#settings-version").innerHTML = wp.app.version;
		
		return this;
	},
	
	blogRemoved:function() {
		if(wp.app.blogs.length == 0) {
			wp.nav.setPage("start");
		} else {
			this.render();
		};
	},
	
	addBlog:function() {
		wp.nav.push("login");
	},
	
	createBlog:function() {
		alert(_s("prompt-create-blog"));
		window.open("https://signup.wordpress.com/signup/?ref=wp-fxos", "", "resizable=yes,scrollbars=yes,status=yes");
		wp.nav.push("login");
	},
	
	publishSettings:function(evt) {
		evt.stopPropagation();
		wp.nav.push("settings-publish-settings");
	},
	
	about:function() {
		wp.nav.push("about");
	},
	
	reset:function() {
		// Reset the app. Deletes local storage and indexeddb.
		if(confirm("This will remove all data in the app. Are you sure?")) {
			delete localStorage.blogKey;
			delete localStorage.publishSetting;
			
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


/* 


*/
wp.views.BlogItemView = Backbone.View.extend({
	model:null, 
	
	tagName:"li",
	
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

		var div = document.createElement("div");
		div.innerHTML = wp.views.templates[this.template_name].text;

		var span = div.querySelector("span");		
		span.innerHTML = this.model.get("blogName");
		
		this.$el.html(div.innerHTML);
	
		return this;
	},
	
	edit:function(evt) {
		evt.stopPropagation();
//		new wp.views.EditBlogModal({model:this.model});		
		var page = new wp.views.SettingsSitePage({model:this.model});
		wp.nav.push(page);
	},
	
	del:function(evt) {
		evt.stopPropagation();
		
		if(confirm(_s("prompt-remove-blog?"))){
			this.model.remove();
		};
	}
	
});
wp.views.registerTemplate("settings-blog-item");


/* 


*/
wp.views.EditBlogModal = Backbone.View.extend({
	model:null, 
	
	template_name:"settings-edit-modal",
	
	tagName:"x-modal",
	
	attributes:{
		"overlay":true,
		"esc-hide":true
	},
	
	events: _.extend({
		"click button.save":"save",
		"click button.cancel":"hide",
		"modalhide":"hide"
	}),
	
	initialize:function(options) {
		this.model = options.model;
		
		this.render();
	},
	
	render:function() {
		var div = document.createElement("div");
		div.innerHTML = wp.views.templates[this.template_name].text;

		this.$el.html(div.innerHTML);
		
		this.el.querySelector("#username").value = this.model.get("username");
		this.el.querySelector("#url").innerHTML = this.model.get("url");
		this.el.querySelector("#blog-name").innerHTML = this.model.get("blogName");

	    document.body.appendChild(this.el);

		return this;
	},
	
	save:function(evt) {
		evt.stopPropagation();

		var username = this.el.querySelector("#username").value;
		var password = this.el.querySelector("#password").value;

		// Validation
		if (!this.validateField(username) || !this.validateField(password) || !this.validateField(url)) {
			alert(_s('prompt-fill-out-all-fields'));
			return;
		}
		
		// if all's good. 
		url = wp.views.normalizeUrl(url);
		
		// encrypt password
		var enc = CryptoJS.AES.encrypt(password, username);
		var pass = enc.toString();

		this.model.set({
			"username":username,
			"password":pass
		});
		var self = this;
		var p = this.model.save();
		p.success(function(){
			if(self.model.id == wp.app.currentBlog.id){
				wp.api.setCurrentBlog(self.model.attributes);
			};
		
			self.hide();
		});
	},
	
	hide:function(evt) {
		if(evt) {
			evt.stopPropagation();
		};
		this.remove();
	},
	
	validateField: function(field) {
		if (field != '')
			return true;
		
		return false;
	}

});
wp.views.registerTemplate("settings-edit-modal");
