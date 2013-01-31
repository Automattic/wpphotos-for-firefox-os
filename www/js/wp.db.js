/*

	wp.db
	Responsible for managing and interacting with the app's IndexedDB. IndexedDB references are at
		http://www.w3.org/TR/IndexedDB/
		https://developer.mozilla.org/en-US/docs/IndexedDB

	Database operations are performed asynchronously. Methods that work with data return a wp.promise that is
	fulfilled when the operation is complete.
	
	Provides an override for Backbone.sync so models can interact with IndexedDB.
	
	Requires: wp.promise
	
	ctor: none
	
	Usage:
		var promise = wp.db.open().success(opened_callback);
		var promise = wp.db.findAll("blogs").success(success_callback).fail(failure_callback);

*/

"use strict";
                     
if(typeof(wp) == "undefined") { var wp = {} };

wp.db = {
	name:"com.wordpress.photos",
	idb:null,
	
	/*
		Version of the database. Matches the number of migrations.
	*/
	getVersion:function() {
		return wp.db.migrations.length;	
	},
	
	/*
		Deletes the database. Use with caution.
	*/
	drop:function() {
		var p = wp.promise();
		
		try {
			// Close an option connection.
			if (wp.db.idb) {
				wp.db.idb.close();
				wp.db.idb = null;
			};
			
			var request = window.indexedDB.deleteDatabase(this.name);
			request.onsuccess = function(event) {
				console.log("wp.db: deleted database " + wp.db.name);
				p.resolve(event.target.result);
			};
			
			request.onerror = function(event) {
				console.log("wp.db: " + event.target.error);
				p.discard(event.target.error);
			};
			
		} catch(err) {
			console.log(err);
			p.discard(err);
		};
		
		return p;
	},
	
	/*
		Open a database connection, performing any pending migrations 
	*/
	open:function() {

		var p = wp.promise();
		
		if (this.idb) {
			p.resolve(this.idb);
			return p;
		};

		try {
			var request = window.indexedDB.open(this.name, this.getVersion());
			
			request.onsuccess = function(event){
				console.log("wp.db: opened");
				
				var db = event.currentTarget.result;
				wp.db.idb = db;				
				
				if(typeof(Backbone) != "undefined") {
					Backbone.ajaxSync = Backbone.sync
					Backbone.sync = function(method, model, options) {
						return wp.db.sync(method, model, options);
					};
				};

				p.resolve(event.target.result);
			};

			request.onupgradeneeded = function(event) {
				console.log("wp.db onupgrade: migrating");
				var db = event.currentTarget.result; // indexeddb connection reference

				for (var i = event.oldVersion; i < wp.db.migrations.length;  i++) {
					console.log("onupgradeneeded: Migrating to version " + (i +1));
					wp.db.migrations[i].up(db);
				};
			};

			request.onerror = function(event) {
				console.log("wp.db: error opening database. " + event.target.errorCode);
				p.discard(event.target.error);
			};			

		} catch(err) {
			console.log(err);
			p.discard(err);
		};
		
		return p;
	},
	
	/*
		Get the object store for the specified model. 
		model: The name of the model
		write: boolean. If true, open the object store for writing. 
	*/
	getObjectStore:function(model, write) {
		try {		
			var mode = (true == write) ? 'readwrite' : 'readonly';
			var tx = this.idb.transaction(model.toLowerCase(), mode);
			return tx.objectStore(model);
			
		} catch(e) {
			console.log("wp.db: error opening the object store " + model);
		};
	},
	
	/*
		Erase the contents of the specified object store.  Use with caution.
	*/
	clearObjectStore:function(model) {
		var p = wp.promise();
		
		try {
			var store = this.getObjectStore(model, true);
			var req = store.clear();
			
			req.onsuccess = function(event) {
				console.log("wp.db: cleared the " + model + " object store");
				p.resolve(event.target.result);
			};
			
			req.onerror = function(event) {
				console.log("wp.db: " + event.target.error);
				p.discard(event.target.error);
			};
			
		} catch(err) {
			p.discard(err);
		}

		return p;
	},
	
	/*
		Get the object for the specified model and key value.
	*/
	find:function(model, key) {
		console.log("wp.db.find: " + arguments);
		var p = wp.promise();
		
		try {
			var store = this.getObjectStore(model);
			var req = store.get(key);
			
			req.onsuccess = function(event) {
				console.log("wp.db.find: " + event.target.result);
				p.resolve(event.target.result);
			};

			req.onerror = function(event) {
				console.log("wp.db.find: " + event.target.error);
				p.discard(event.target.error);
			};			

		} catch (err) {
			p.discard(err);
		};
		
		return p;
	},
	
	/*
		Get all the objects for the specified model, optionally filtered by the specified index and key value.
	*/
	findAll:function(model, index, key) {
		console.log("wp.db.findAll: ", model, index, key);
		var p = wp.promise();
		
		try {
			var store = this.getObjectStore(model);		
			var req = null;
	
			if(typeof(index) != 'undefined' && typeof(key) != 'undefined') {
				var range = null;
				if (key instanceof Array) {
					if (key.length == 1) {
						range = IDBKeyRange.only(key[0]);
						
					} else {
						range = IDBKeyRange.bound(key[0], key[1]);
					};
					
				} else {
					range = IDBKeyRange.only(key);
				};
			
				var index = store.index(index);
				req = index.openCursor(range);
				
			} else {
				req = store.openCursor();
			};
			
			// Iterate over the cursor and store each result in an array. Pass the array
			// to the promise's resolve method. 
			// Note: calling continue on the cursor triggers the onsuccess callback.
			var arr = [];
			req.onsuccess = function(event){
				var cursor = event.target.result;
				if(cursor) {
					// WTF: If we push cursor.value its keys can be undefined!? Closure issue maybe? 
					// Make a copy and push it instead.
					var obj = {};
					for(var key in cursor.value){
						obj[key] = cursor.value[key];
					};
					arr.push(obj);
					cursor.continue();
				} else {
					p.resolve(arr);
				};
			};
			
			req.onerror = function(event) {
				console.log(event.target.error);
				p.discard(event.target.error);
			};
			
		} catch(err) {
			p.discard(err);
		};
		
		return p;
	},
	
	/*
		Saves an object to the object store for the specified model. 
	*/
	save:function(model, object) {
		console.log("wp.db.save: ", model, object);
		var p = wp.promise();
		
		try {
			var store = this.getObjectStore(model, true)
			var req = store.put(object);
	
			req.onsuccess = function(event) {
				console.log("wp.db.save: onsuccess ", event.target.result);
				// When saving an id is returned. The model won't know how to parse that so
				// resolve as an object we can check and update the model accordingly.
				p.resolve({"__id__":event.target.result});
			};
			
			req.onerror = function(event) {
				console.log("wp.db.save: onerror ", event.target.error);
				p.discard(event.target.error);
			};
		} catch(err) {
			console.log(err);
			p.discard(err);
		};
		
		return p;
	},
	
	/*
		Removes the object for the specified key from the object store for the specified model.
	*/
	remove:function(model, key) {
		console.log("wp.db.remove: " + arguments);
		var p = wp.promise();
		
		try {
			var store = this.getObjectStore(model);
			var req = store.delete(key);
			
			req.onsuccess = function(event) {
				console.log("wp.db.remove: " + event.target.result);
				p.resolve(event.target.result);
			};
			
			req.onerror = function(event) {
				console.log("wp.db.remove: " + event.target.error);
				p.discard(event.target.error);
			};
		
		} catch(err) {
			p.discard(err);
		};
		
		return p;
	},
	
	/*
		Backbone.sync override. http://backbonejs.org/#Sync 
		Wired up in the call to open. 
		
		options = {
			where:{index:name, value:value}
		}
		
	*/
	sync:function(method, model, options) {
		options = options || {};
		var p = null;

		switch(method) {
			
			case "read" :
				var id = model.id;
				if (id) {
					// Model
					p = wp.db.find(model.store, id);
					
				} else {
					// Collection
					if (options.where) {
						// Get all records for the model matching the where condition.
						var w = options.where;
						p = wp.db.findAll(model.store, w.index, w.value);

					} else {
						// Get all records for the model.
						p = wp.db.findAll(model.store);
					};
				};
			
				break;
				
			case "create" :
			case "update" :
				var data = model.attributes;
				
				p = wp.db.save(model.store, data);
	
				break;
				
			case "delete" :
				p = wp.db.remove(model.store, model.id);
				
				break;
				
			default :
				// Not supported.
				break;
		};
	
		if (!p) return;
		
		var success = options.success;
		var error = options.error;
		
		p.success(function(){
			if (success) {
				// Backbone callback.
				var result = p.result();
				
				// If this was a save we need to format the id in 
				// a way the model can parse.
				if(typeof(result["__id__"]) != "undefined"){
					var obj = {};
					obj[model.idAttribute] = result["__id__"];
					result = obj;
				};
				success(model, obj, options);
			};
			model.trigger('sync', model, p.result(), options);
		});
		
		p.fail(function() {
			if(error) {
				error(model, p.result(), options);
			};
			model.trigger('error', model, p.result(), options);
		});
		
		return p;
	}

};

/*
	Migrations for the database. 
	An array of objects encapsulating a single migration. 
	Run the migration by by calling up()
	Migrations may only be called in the context of an onupgradeneeded event.
*/
wp.db.migrations = [
	{
		up:function(db){
			
			var store; 
			// blogs
			// key is autoincrementing integer
			store = db.createObjectStore("blogs", {keyPath:"xmlrpc"});
			
			// posts
			store = db.createObjectStore("posts", {keyPath:"id", autoIncrement:true});
			store.createIndex("blogkey", "blogkey");
			store.createIndex("link", "link", {unique:true} );

		}
	}
];