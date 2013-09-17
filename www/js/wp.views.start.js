/*

	Views require that their templates be loaded in the dom before being called.
	
*/

"use strict";

wp.views.StartPage = wp.views.Page.extend({
	template_name:"start",
	
	initialize:function() {
		this.render();
	},

	events: _.extend({
		"click button.login": "showLogin",
		"click button.create-account": "showCreate"
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
//		wp.app.routes.navigate("login", {trigger:true});
		wp.nav.push("login");
	},
	
	showCreate:function() {
		alert(_s("prompt-create-blog"));
		window.open("https://signup.wordpress.com/signup/?ref=wp-fxos", "", "resizable=yes,scrollbars=yes,status=yes");
//		wp.app.routes.navigate("login", {trigger:true});
		wp.nav.push("login");
	}
	
});
wp.views.registerTemplate("start");
