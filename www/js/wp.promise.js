/*
	wp.promise
	Returns a promise object for use with asynchronous tasks. 
	
	ctor: none
	
	Usage:
		Creating and fulfilling a promise:
			var p = wp.promise(); // Create the promise. Return the promise at the end of the function that started the async task.
				... asyncronous task does its thing.
			p.resolve(result_of_async_task); // If the task was successful.
			p.discard(failure_object_or_message); // If the task was unsuccessful. 

		Callbacks:
			var p = startAsyncTaskThatReturnsAPromise();
			p.success(success_callback_function_reference); // Called when the asyc task is complete and p.resolve(result) is called.
			p.fail(failure_callback_function_reference); // Called when the async task is complete and p.discard(result) is called.
			p.always(callback_function_reference); // Called after then or fail callbacks have been called.
			
		Getting the result of the async task:
			p.result();
		
		Getting the status of the promise (incomplete, complete, failed) :
			p.status();
			
		You can also chain callbacks, and have multiple callbacks of the same type. 
			p.then(a_callback).then(another_callback).fail(yet_another_callback).always(still_another_callback);
			
		Callbacks added after a promise is resolved or discarded are invoked immediately.
*/
                     
if( typeof wp === 'undefined' ) { 
	var wp = {};
}

wp.promise = function() {
	"use strict";
	var _status = 'incomplete'; // complete, failed
	var _result = null;
	var _fail = [];
	var _success = [];
	var _always = [];
	var _progress = [];
	 
	var perform = function( arr, obj ) {
		if ( ! arr ) {
			return;
		}
		
		for ( var i = 0; i < arr.length; i++ ) {
			var func = arr[i];
			if ( func instanceof Function ) {
				try {
					func( obj );
				} catch( ignore ) {
					wp.log( ignore );
				}
			}
		}
	};
	 
	var p = {
		 
		success: function( f ) {
			if ( f instanceof Function ) {
				if ( _status === 'complete' ) {
					perform( [f] );
				} else if( _status === 'incomplete' ) {
					_success.push( f );
				}
			}
			return p;
		},
		 
		fail: function( f ) {
			if ( f instanceof Function ) {
				if ( _status === 'failed' ) {
					perform( [f] );
				} else if( _status === 'incomplete' ) {
					_fail.push( f );
				}
			}
			return p;
		},
		
		always: function( f ) {
			if ( f instanceof Function ) {
				if ( _status !== 'incomplete' ) {
					perform( [f] );
				} else {
					_always.push(f);
				}
			}
			return p;
		},
		
		progress: function( f ) {
			if (f instanceof Function) {
				_progress.push( f );
			}
			return p;
		},
		
		status: function() {
			return _status;
		},
		 
		result: function() {
			return _result;
		},
		
		discard: function( obj ) {
			_result = obj;
			_status = 'failed';
 
			perform( _fail );
			perform( _always );

			_fail = null;
			_progress = null;
			_success = null;
			_always = null;
		},
		 
		resolve: function( obj ) {
			_result = obj;
			_status = 'complete';

			perform( _success );
			perform( _always );
			
			_fail = null;
			_progress = null;
			_success = null;
			_always = null;
		},
		
		notify: function( obj ) {
			perform( _progress, obj );
		}
	};
	
	return p;
};


/*
	A promise that managed a queue of promises.  
	The queue is resolved when all promises in the queue have been resolved or revoked. 
*/
wp.promiseQueue = function() {
	"use strict";
	var q = wp.promise();
	var arr = [];
	
	function checkQueue() {
		for ( var i = 0; i < arr.length; i++ ) {
			var promise = arr[i];
			if ( promise.status() === 'incomplete' ) {
				return;
			}
		}
		while( arr.pop() != null ) {
			continue;
		}
		q.resolve();
	}
	
	q.add = function( promise ) {
		promise.always( function() {
			checkQueue();
		} );
		arr.push( promise );
	};

	return q;
};