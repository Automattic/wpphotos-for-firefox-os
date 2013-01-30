/*


*/

"use strict";

if(typeof(wp) == "undefined") { var wp = {} };

wp.Routes = Backbone.Router.extend({

	stage:null,

	initialize:function(options) {
		this.stage = document.getElementById("stage");
console.log("wp.routes.initalize");
console.log(this.stage);
	},
		
	routes: {
		"start":"start",
		"login":"login",
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
