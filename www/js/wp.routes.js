/*


*/

"use strict";

if(typeof(wp) == "undefined") { var wp = {} };

wp.Routes = Backbone.Router.extend({

	stage:null,

	initialize:function(options) {
		this.stage = document.getElementById("stage");
	},
		
	routes: {
		"start":"start",
		"login":"login",
		"about":"about",
		"settings":"settings",
		"posts":"posts",
		"editor":"editor"
	},
	
	start:function() {
console.log("wp.routes.start");
		var view = new wp.views.StartPage();
		this.setView(view);
	},
	
	login:function() {
console.log("wp.routes.login");
		var view = new wp.views.LoginPage();
		this.setView(view);
	},
	
	about:function() {
console.log("wp.routes.about");
		var view = new wp.views.AboutPage();
		this.setView(view);
	},

	settings:function() {
console.log("wp.routes.settings");
		var view = new wp.views.SettingsPage();
		this.setView(view);
	},
	
	posts:function() {
console.log("wp.routes.posts");
		var view = new wp.views.PostsPage();
		this.setView(view);
	},
	
	editor:function() {
console.log("wp.routes.editor");
		var view = new wp.views.EditorPage();
		this.setView(view);
	},
	
	setView:function(view) {
console.log("wp.routes.setView");
		while (stage.firstChild) {
		  stage.removeChild(stage.firstChild);
		};
		
		this.stage.appendChild(view.el);
	}

});
