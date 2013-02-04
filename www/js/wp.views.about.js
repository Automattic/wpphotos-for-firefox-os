/* 


*/

"use strict";

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
