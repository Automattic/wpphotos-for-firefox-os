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
		};

		var pubSetting = localStorage.publishSetting || 0;
		this.el.querySelector("#settings-publish-settings").innerHTML = _s(this.publish_settings_options[pubSetting]);
		
		return this;
	},
	
	blogRemoved:function() {
		if(wp.app.blogs.length == 0) {
			wp.app.routes.navigate("start",{trigger:true});
		} else {
			this.render();
		};
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
		
		var html = "<h1>" + _s("title-publish-settings") + "</h1><ul>";
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

		var span = ul.querySelector("span");		
		span.innerHTML = this.model.get("blogName");
		
		this.$el.html(ul.querySelector("li"));
	
		return this;
	},
	
	edit:function(evt) {
		evt.stopPropagation();
		
		new wp.views.EditBlogModal({model:this.model});
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
		this.el.querySelector("#password").value = this.model.get("password");
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
		
		this.model.set({
			"username":username,
			"password":password
		});
		var self = this;
		var p = this.model.save();
		p.success(function(){
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
