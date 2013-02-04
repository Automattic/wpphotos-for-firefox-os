/* 


*/

"use strict";

wp.views.EditorPage = wp.views.Page.extend({
	template_name:"editor",
	
	initialize:function() {
		this.render();
		
		// This is where we need to launch the mozactivity for the picker.
		try {
			if(typeof(MozActivity) == "undefined") {
				return;
			};
			
			var self = this;
			// Start a Moz picker activity for the user to select an image to upload
			// either from the gallery or the camera. 
			var activity = new MozActivity({
				name: 'pick',
				data: {
					type: 'image/jpeg'
				}
			});
					
			activity.onsuccess = function() {
				self.onImageSelected(activity.result.blob);
			};
	
			activity.onerror = function() {
				//TODO
			};
			
		} catch(e) {
			// Checking typeof(MozActivity) in a browser throws an exception in some versions of Firefox. 
			// just pass thru.
			return; 
		};
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

		return this;
	},
	
	onImageSelected:function(blob) {
		var img = this.el.querySelector("#photo");
		img.src = URL.createObjectURL(blob);
	},
	
	save:function() {
		
		var img = this.el.querySelector("#photo");
		var caption = this.el.querySelector("#caption");
		var title = this.el.querySelector("#post-title");
		var content = this.el.querySelector("#post-content");
		var tags = this.el.querySelector("#post-tags");
		
		var canvas = this.el.querySelector("#photo-canvas");
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
	
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
		
		// Save a local draft or sync to the server?
		var p;
		
		var publishSetting = localStorage.publishSetting || 0;		
		
		switch(publishSetting) {
			
			case 0: //prompt
				
				if(confirm(_s("prompt-publish-now"))) {
					p = post.uploadAndSave(image_data, caption.value.trim()); // saves
				} else {
					post.setPendingPhoto(image_data, caption.value.trim());
					p = post.save();
				};
				
				break;
			case 1: // publish now
				
				p = post.uploadAndSave(image_data, caption.value.trim()); // saves
									
				break;
			case 2: // publish later

				post.setPendingPhoto(image_data, caption.value.trim());
				p = post.save();

				break;
		};
		
		wp.app.posts.add(post, {at:0});
		wp.app.routes.navigate("posts", {trigger:true});
		return p;
	},
	
	goBack:function() {
		if(confirm(_s("prompt-cancel-editing?"))) {
			wp.app.routes.navigate("posts", {trigger:true});
		};
	}
	
});
wp.views.registerTemplate("editor");
