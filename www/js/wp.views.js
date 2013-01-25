/*

	Views require that their templates be loaded in the dom before being called.
	
*/

'use strict';

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
				wp.views.templates[key].text = div.querySelector("#template").innerHTML;
				
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


/* 


*/
wp.views.StartPage = Backbone.View.extend({
	template_name:"start",
	
	initialize:function() {
		this.render();
	},
	
	render:function() {
		var template = _.template( wp.views.templates[this.template_name].text, {} );
		
		this.$el.html( template );

		return this;
	}
	
});
wp.views.registerTemplate("start");


/* 


*/
wp.views.LoginPage = Backbone.View.extend({
	template_name:"login",
	
	initialize:function() {
		this.render();
	},
	
	render:function() {
		var template = _.template( wp.views.templates[this.template_name].text, {} );
		
		this.$el.html( template );

		return this;
	}
	
});
wp.views.registerTemplate("login");


/* 


*/
wp.views.PostsPage = Backbone.View.extend({
	template_name:"posts",
	
	initialize:function() {
		this.render();
	},
	
	render:function() {
		var template = _.template( wp.views.templates[this.template_name].text, {} );
		
		this.$el.html( template );

		return this;
	}
	
});
wp.views.registerTemplate("posts");


/* 


*/
wp.views.EditorPage = Backbone.View.extend({
	template_name:"editor",
	
	initialize:function() {
		this.render();
	},
	
	render:function() {
		var template = _.template( wp.views.templates[this.template_name].text, {} );
		
		this.$el.html( template );

		return this;
	}
	
});
wp.views.registerTemplate("editor");


