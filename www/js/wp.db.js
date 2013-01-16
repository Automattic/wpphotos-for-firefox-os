/*

	wp.db
	Responsible for managing and interacting with the app's IndexedDB. IndexedDB references are at
		http://www.w3.org/TR/IndexedDB/
		https://developer.mozilla.org/en-US/docs/IndexedDB	

	Database operations are performed asynchronously. Methods that work with data return a wp.promise that is
	fulfilled when the operation is complete.
	
	Requires: wp.promise
	
	ctor: none
	
	Usage:
		var promise = wp.db.open().success(opened_callback);
		var promise = wp.db.findAll("blogs").success(success_callback).fail(failure_callback);

*/

'use strict';
                     
if(typeof(wp) == "undefined") { var wp = {} };

wp.db = {
	name:"com.wordpress.photos",
	version:1,
	idb:null,
	
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
			var request = window.indexedDB.open(this.name, this.version);
			request.onerror = function(event) {
				console.log("wp.db: error opening database. " + event.target.errorCode);
				p.discard(event.target.error);
			};
			
			request.onupgradeneeded = function(event) {
				console.log("wp.db: migrating");
				var db = event.currentTarget.result;
				wp.db.idb = db;
				wp.db.migrate(event);
				
				p.resolve(event.target.result);
			};
			
			request.onsuccess = function(event) {
				console.log("wp.db: opened");
				var db = event.currentTarget.result;
				wp.db.idb = db;

				p.resolve(event.target.result);
			};

		} catch(e) {
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
		var p = wp.promose();
		
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
		console.log("wp.db.findAll: " + arguments);
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
					arr.push(cursor.value);
					cursor.continue();
					
				} else {
					console.log(arr);
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
		console.log("wp.db.save: " + arguments);
		var p = wp.promise();
		
		try {
			var store = this.getObjectStore(model, true)
			var req = store.put(object);
	
			req.onsuccess = function(event) {
				console.log("wp.db.save: " + event.target.result);
				p.resolve(event.target.result);
			};
			
			req.onerror = function(event) {
				console.log("wp.db.save: " + event.target.error);
				p.discard(event.target.error);
			};
		} catch(err) {
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
		Migrations for the database. 
		migrate may only be called in the context of an onupgradeneeded event, and passing in the event itself.
	*/	
	migrate:function(event) {
		var db = wp.db.idb
		if (event.newVersion == null ) {
			// We're deleting. 
			console.log("onupgradeneeded: newVersion was null");
			return;
		};
		
		// Create the object stores.
		var store;
		if (event.oldVersion < 1) {
			console.log("onupgradeneeded: Migrating to version 1");
	
			// blogs
			// key is autoincrementing integer
			store = db.createObjectStore("blogs", {keyPath:"xmlrpc"});
			
			// posts
			store = db.createObjectStore("posts", {keyPath:"post_link"});
			store.createIndex("blogkey", "blogkey");
			
			// media
			// key can be either a link for uploaded media, or an int for local media belonging to a draft
			store = db.createObjectStore("media", {keyPath:"link", autoIncrement:true});
			store.createIndex("postkey", "postkey");
			store.createIndex("blogkey", "blogkey");
			
			// local drafts
			// key is an autoincrementing integer
			store = db.createObjectStore("drafts", {keyPath:"key", autoIncrement:true});
			store.createIndex("blogkey", "blogkey");
		};
	}
};

