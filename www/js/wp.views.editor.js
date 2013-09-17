/* 


*/

"use strict";

wp.views.EditorPage = wp.views.Page.extend({
	template_name:"editor",
	
	initialize:function() {
		this.render();
	},
	
	events:_.extend({
		"click button.save": "save",
		"click button.back": "goBack"
	}),
	
	render:function() {
		var template = wp.views.templates[this.template_name].text;
		// update the dom

		this.$el.html( template );
		
		// webLi0n doesn't pickup placeholders on inputs so we need to do this manually
		this.el.querySelector("#caption").placeholder = _s("control-caption");
		this.el.querySelector("#post-title").placeholder = _s("control-post-title");
		this.el.querySelector("#post-content").placeholder = _s("control-tap-here");
		this.el.querySelector("#post-tags").placeholder = _s("control-tags");

		var img = this.el.querySelector("#photo");
		try {
			if(typeof(MozActivity) == "undefined") {
				img.src = "img/start/1.jpg"; // For browser testing prime with a local image.
			} else {
				img.src = URL.createObjectURL(wp.app.selected_image_blob); // Saved from the posts view.
				wp.app.selected_image_blob = null; // discard.
			};
		} catch(e) {
			// Checking typeof(MozActivity) in a browser throws an exception in some versions of Firefox.
			img.src = "img/start/1.jpg"; // For browser testing prime with a local image.			
		};
		return this;
	},
	
	goBack:function() {
		if(confirm(_s("prompt-discard-post?"))) {
//			wp.app.routes.navigate("posts", {trigger:true});
      wp.nav.pop();
		};
	},
	
	save:function() {
		// Save a local draft or sync to the server?
		var publishSetting = parseInt(localStorage.publishSetting) || 0;
		switch(publishSetting) {
			case 0:
				this.prompt();
				break;
			case 1:
				this.upload();
				break;
			case 2:
				this.prepareToSave(false); // Save local
				break;
		};
	},
	
	prompt:function(){
		if(confirm(_s("prompt-publish-now"))) {
			this.upload();
		} else {
			this.prepareToSave(false); // Save local
		};
	},
	
	upload:function() {
		if(!wp.app.isNetworkAvailable()){
			alert(_s("prompt-network-missing-saving-locally"));
			this.prepareToSave(false); // Save local
		};
		
		this.prepareToSave(true); // Upload and save
	},
	
	prepareToSave:function(upload_now){
		// There can be an apparent lag on some devices when getting the image data from a canvas.
		// We don't want the app to look unresponsive so show the loading indicator, 
		// give the DOM a chance to refresh, then get the image data.
		wp.app.showLoadingIndicator(_s("Formatting..."));
		
		var self = this;
		setTimeout(function(){
			self.performSave(upload_now);
			wp.app.hideLoadingIndicator();
		}, 100);
	},

	performSave:function(upload_now) {
		
		var img = this.el.querySelector("#photo");
		var caption = this.el.querySelector("#caption");
		var title = this.el.querySelector("#post-title");
		var content = this.el.querySelector("#post-content");
		var tags = this.el.querySelector("#post-tags");
		
		// Unagi device camera takes photos at 1200 x 1600.
		// Images size > 2mb so downsize for faster uploads and better performance.
		// TODO: Add a setting to let the user decide on image size.
		var maxWidth = (img.naturalWidth < img.naturalHeight) ? 600 : 800;
		var width = img.naturalWidth;
		var height = img.naturalHeight;
		
		if (img.naturalWidth > maxWidth) {
			var r = maxWidth / img.naturalWidth;
			width = maxWidth;
			height = height * r;
		};
		
		var canvas = this.el.querySelector("#photo-canvas");
		canvas.width = width;
		canvas.height = height;
		
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, width, height);
	
		var image_data = canvas.toDataURL("image/png", 0.80);
		
		var attrs = {
			"blogkey":wp.app.currentBlog.id,
			"post_title":title.value.trim(),
			"post_content":content.value.trim()
		};

		if (tags.value.trim().length > 0){
			attrs["terms_names"] = {"post_tag":tags.value.trim().split(",")};
		};
		
		var post = new wp.models.Post(attrs);
		
		var p;
		if(upload_now){
			p = post.uploadAndSave(image_data, caption.value.trim()); // saves
		} else {
			post.setPendingPhoto(image_data, caption.value.trim());
			p = post.save();
		};
		
		p.fail(function(){
			var result = p.result();
			var msg = _s("prompt-problem-publishing");
			if (result.status == 0 && result.readyState == 0) {
				msg = "bad url";
			} else if(result.faultCode){
				if (result.faultCode == 403) {
					msg = _s("prompt-bad-username-password");
				} else {
					msg = result.faultString;
				};
			};
			alert(_s(msg));
		});
		
		wp.app.posts.add(post, {at:0});
//		wp.app.routes.navigate("posts", {trigger:true});
    wp.nav.pop();
	}
	
});
wp.views.registerTemplate("editor");
