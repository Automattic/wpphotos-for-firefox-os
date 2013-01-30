/*
	wp.Nav
	Manages view navigation.  Inspired by the behavior of the iOS UINavigationController. 
	DOM elements representing a view are pushed onto or popped onto the dispaly stack and animated and on or off screen.
	
	Requires: wp.nav.css
	
	ctor options
		container : The DOM node acting as a container for elements acting as views.
		
	Usage:
		var nav = new wp.Nav(element);
		nav.pushView(element);
		nav.popView();
		nav.popToView(element);
		nav.popToRoot();
		nav.setViews(array);
		
*/

"use strict";

if(typeof(wp) == "undefined") { var wp = {} };

wp.Nav = function(node){
	this._container = node;
	this._transitioning = false;
	
	this.views = [];
	this.popped = [];
	this.pushed = [];
	
	this.pending_transitions = 0;
};


wp.Nav.prototype.handleTransitionEnd = function() {
	
};


wp.Nav.prototype.pushView = function(view) {
	
};


wp.Nav.prototype.popView = function() {
	
};


wp.Nav.prototype.popToView = function(view) {
	
};


wp.Nav.prototype.setViews = function(views) {
	// Set the view stack.
	// Make the last one visible. 
	// Do not use transitions. 
};


wp.Nav.prototype.getCurrentView = function() {
	if (this._views.length == 0) return null;
	
	return this._views[this._views.length - 1];
};

