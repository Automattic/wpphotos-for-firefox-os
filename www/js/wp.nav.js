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

wp.nav = {

  stage:null,
  
  transitions: ["scrollLeft", "coverUp", "none"],

  init: function() {
    this.stage = document.getElementById('stage');
    var self = this;
    this.stage.addEventListener('shuffleend', function(e){
      self._trimDeck();
    });
  },
  
  push: function(page, transition) {
    var card = this._fetchCard(page, transition);
    this.stage.appendChild(card);
    
    var allCards = this.stage.getAllCards();
    this.stage.shuffleTo(allCards.indexOf(card));
  },
  
  pop: function() {
  	// When popping we want to play current/top card's animation in reverse.
  	// The deck is going to play the previous cards animation in reverse. (doH!)
  	// We can work around this behavior by assigning the current card's desiredTransition
  	// to the previos card's transitionOverride property.
    var currIndex = this.stage.selectedIndex;
    if (currIndex > 0) {
      var override = this.stage.selectedCard.desiredTransition || "scrollLeft";
      var card = this.stage.cards[currIndex-1];
      card.transitionOverride = override;
    }
    this.stage.historyBack();
  },
  
  setPage: function(page, transition, forceForward) {
    var card = this._fetchCard(page, transition);
    var progress = forceForward ? "forward" : null;
    
    this.stage.insertBefore(card, this.stage.firstChild);
    
    var allCards = this.stage.getAllCards();
    this.stage.shuffleTo(allCards.indexOf(card), progress);
  },
  
  _trimDeck: function() {
    var allCards = this.stage.getAllCards();
    var currentCard = this.stage.getSelectedCard();
    for (var i = allCards.length; i > 0; i--) {
      var card = this.stage.getCardAt(i-1);
      if (card != currentCard) {
        this.stage.removeChild(card);
      } else {
        return;
      };
    };
  },
  
  _fetchCard: function(page, transition) {
  	var view;
  	if (typeof page === 'string') {
	    var allCards = this.stage.getAllCards();
	    for(var card in allCards) {
	      if (card.cardName == page) {
      	    if (this._isValidTransition(transition)) {
      	      card.desiredTransition = transition;
		      card.transitionOverride = transition;
		    }
	        return card;
	      }
	    }
	  
	    view = this._fetchPage(page);
	    if (!page) {
	      alert("Page does not exist.");
	      return;
	    }
    } else {
	    view = page;
	    page = view.template_name;
    }

    var card = document.createElement("x-card");
    card.cardName = page;
    if (this._isValidTransition(transition)) {
	  card.desiredTransition = transition;
      card.transitionOverride = transition;
    }
    card.appendChild(view.el);
    return card;
  },
  
  _isValidTransition: function(transition) {
    if(!transition){
      return false;
    }
    
    for(var t in this.transitions) {
      if (this.transitions[t] == transition) {
        return true;
      }
    }
    
    return false;
  },
  
  _fetchPage: function(page) {
    var view;
    
    switch(page) {
      case 'start':
        view = new wp.views.StartPage();
        break;
      case 'login':
        view = new wp.views.LoginPage();
        break;
      case 'posts':
        view = new wp.views.PostsPage();
        break;
      case 'editor':
        view = new wp.views.EditorPage();
        break;
      case 'settings':
        view = new wp.views.SettingsPage();
        break;
      case 'about':
        view = new wp.views.AboutPage();
        break;
      case 'settings-site' :
      	view = new wp.views.SettingsSitePage();
      	break;
      case 'settings-publish-settings' :
      	view = new wp.views.SettingsPublishPage();
      	break;
    };
    
    return view;
  }
  
};
