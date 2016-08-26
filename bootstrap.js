// Template based on Private Tab by Infocatcher
// https://addons.mozilla.org/firefox/addon/private-tab

'use strict';

const WINDOW_LOADED = -1;
const WINDOW_CLOSED = -2;

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/Timer.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyServiceGetter(this,
	'gSessionStore',
	'@mozilla.org/browser/sessionstore;1',
	'nsISessionStore');

let prefs = Cu.import('resource://gre/modules/Preferences.jsm', {}).Preferences;

let defaultImage = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iMCAwIDI0IDI0Ij4NCjxnIGZpbGw9IiNmYmZiZmIiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjUpIiBzdHJva2Utd2lkdGg9Ii44Ij4NCiAgPGcgaWQ9InNlYXJjaCI+DQogICAgPHBhdGggZD0iTTIsMTAuMDE4YzAsNC40MywzLjU4NSw4LjAxOSw4LjAwOSw4LjAxOSBjMS42MDMsMCwzLjA5NS0wLjQ3Myw0LjM0OC0xLjI4NWw0LjgwNiw0LjgxYzAuNTgsMC41ODMsMS41MjMsMC41ODMsMi4xMDUsMGwwLjI5Ni0wLjI5N2MwLjU4Mi0wLjU4MywwLjU4Mi0xLjUyNywwLTIuMTEgbC00LjgwOC00LjgxNGMwLjgtMS4yNDcsMS4yNjUtMi43MywxLjI2NS00LjMyM2MwLTQuNDMtMy41ODctOC4wMTgtOC4wMTItOC4wMThDNS41ODUsMiwyLDUuNTg5LDIsMTAuMDE4eiBNNS4xMDQsMTAuMDIxIGMwLTIuNzE2LDIuMTk2LTQuOTE1LDQuOTA2LTQuOTE1YzIuNzEsMCw0LjkwOCwyLjE5OSw0LjkwOCw0LjkxNWMwLDIuNzEyLTIuMTk4LDQuOTExLTQuOTA4LDQuOTExIEM3LjMsMTQuOTMxLDUuMTA0LDEyLjczMiw1LjEwNCwxMC4wMjF6Ii8+DQogIDwvZz4NCjwvZz4NCjwvc3ZnPg==';
let defaultImage16 = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iMCAwIDI0IDI0IiBoZWlnaHQ9IjE2cHgiIHdpZHRoPSIxNnB4Ij4NCjxnIGZpbGw9IiNmYmZiZmIiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjUpIiBzdHJva2Utd2lkdGg9Ii44Ij4NCiAgPGcgaWQ9InNlYXJjaCI+DQogICAgPHBhdGggZD0iTTIsMTAuMDE4YzAsNC40MywzLjU4NSw4LjAxOSw4LjAwOSw4LjAxOSBjMS42MDMsMCwzLjA5NS0wLjQ3Myw0LjM0OC0xLjI4NWw0LjgwNiw0LjgxYzAuNTgsMC41ODMsMS41MjMsMC41ODMsMi4xMDUsMGwwLjI5Ni0wLjI5N2MwLjU4Mi0wLjU4MywwLjU4Mi0xLjUyNywwLTIuMTEgbC00LjgwOC00LjgxNGMwLjgtMS4yNDcsMS4yNjUtMi43MywxLjI2NS00LjMyM2MwLTQuNDMtMy41ODctOC4wMTgtOC4wMTItOC4wMThDNS41ODUsMiwyLDUuNTg5LDIsMTAuMDE4eiBNNS4xMDQsMTAuMDIxIGMwLTIuNzE2LDIuMTk2LTQuOTE1LDQuOTA2LTQuOTE1YzIuNzEsMCw0LjkwOCwyLjE5OSw0LjkwOCw0LjkxNWMwLDIuNzEyLTIuMTk4LDQuOTExLTQuOTA4LDQuOTExIEM3LjMsMTQuOTMxLDUuMTA0LDEyLjczMiw1LjEwNCwxMC4wMjF6Ii8+DQogIDwvZz4NCjwvZz4NCjwvc3ZnPg==';

function install(params, reason) {
}
function uninstall(params, reason) {
}
function startup(params, reason) {
	contextSearchCompact.init(reason);
}
function shutdown(params, reason) {
	contextSearchCompact.destroy(reason);
}

let contextSearchCompact = {
	initialized: false,
	init: function(reason) {
		if(this.initialized)
			return;
		this.initialized = true;

		this.nodeIDs = {
			searchMenu: 'context-search-compact-by-2k1dmg-menu',
			searchMenuPopup: 'context-search-compact-by-2k1dmg-popup'
		};

		for(let window of this.windows)
			this.initWindow(window, reason);
		Services.ww.registerNotification(this);

		Services.obs.addObserver(this, 'browser-search-engine-modified', false);
		if(prefs.has('browser.search.hiddenOneOffs'))
			prefs.observe('browser.search.hiddenOneOffs', this);
	},
	destroy: function(reason) {
		if(!this.initialized)
			return;
		this.initialized = false;

		Services.obs.removeObserver(this, 'browser-search-engine-modified', false);
		if(prefs.has('browser.search.hiddenOneOffs'))
			prefs.ignore('browser.search.hiddenOneOffs', this);

		for(let window of this.windows)
			this.destroyWindow(window, reason);
		Services.ww.unregisterNotification(this);
	},

	observe: function(subject, topic, data) {
		switch(topic) {
			case 'domwindowopened':
				subject.addEventListener('load', this, false);
				break;
			case 'domwindowclosed':
				this.destroyWindow(subject, WINDOW_CLOSED);
				break;
			case 'nsPref:changed':
			case 'browser-search-engine-modified':
				if(typeof this.updateTimeoutID == 'number') {
					clearTimeout(this.updateTimeoutID);
					this.updateTimeoutID = null;
				}
				this.updateTimeoutID = setTimeout(function() {
					this.update();
				}.bind(this), 1000);
				break;
		}
	},
	handleEvent: function(event) {
		switch(event.type) {
			case 'load':              this.loadHandler(event);                  break;
			case 'click':             this.clickHandler(event);                 break;
			case 'command':           this.commandHandler(event);               break;
			case 'popupshowing':      this.popupshowingHandler(event);          break;
			case 'popuphidden':       this.popuphiddenHandler(event);           break;
		}
	},

	loadHandler: function(event) {
		let window = event.originalTarget.defaultView;
		window.removeEventListener('load', this, false);
		this.initWindow(window, WINDOW_LOADED);
	},
	windowClosingHandler: function(event) {
		let window = event.currentTarget;
		this.destroyWindowClosingHandler(window);
	},
	destroyWindowClosingHandler: function(window) {
		let {document} = window;

		let context = document.getElementById('contentAreaContextMenu');
		let menu = document.getElementById(this.nodeIDs.searchMenu);

		context.removeEventListener('popupshowing', this, false);
		context.removeEventListener('popuphidden', this, false);

		menu.removeEventListener('command', this, true);
		menu.removeEventListener('click', this, true);
		menu.remove();

		this.removeSheet(window, this.makeCSS());
	},

	initWindow: function(window, reason) {
		if(reason == WINDOW_LOADED && !this.isTargetWindow(window)) {
			return;
		}
		let {document} = window;

		let context = document.getElementById('contentAreaContextMenu');

		context.addEventListener('popupshowing', this, false);
		context.addEventListener('popuphidden', this, false);

		this.loadSheet(window, this.makeCSS());
		this.createSearchMenu(window);
	},
	destroyWindow: function(window, reason) {
		window.removeEventListener('load', this, false);
		if(reason == WINDOW_CLOSED && !this.isTargetWindow(window)) {
			return;
		}
		if(reason != WINDOW_CLOSED) {
			this.destroyWindowClosingHandler(window);
		}
	},
	update: function() {
		this.updateTimeoutID = null;
		for(let window of this.windows)
			this.updateSearchMenu(window);
	},

	get windows() {
		let windows = [];
		let ws = Services.wm.getEnumerator('navigator:browser');
		while(ws.hasMoreElements()) {
			let window = ws.getNext();
			windows.push(window);
		}
		return windows;
	},
	isTargetWindow: function(window) {
		let loc = window.location.href;
		return loc == 'chrome://browser/content/browser.xul';
	},

	popupshowingHandler: function(event) {
		if(event.target.id != 'contentAreaContextMenu')
			return;
		let {target} = event;
		let {ownerDocument: document} = target;

		let menu = document.getElementById(this.nodeIDs.searchMenu);
		let searchSelect = document.getElementById('context-searchselect');

		menu.hidden = searchSelect.hidden;
		menu.label = searchSelect.label;
	},
	popuphiddenHandler: function(event) {
		if(event.target.id != 'contentAreaContextMenu')
			return;
		let {target} = event;
		let {ownerDocument: document} = target;

		let menu = document.getElementById(this.nodeIDs.searchMenu);
		let engine = Services.search.currentEngine || Services.search.defaultEngine;

		menu.label = engine.name;
	},
	clickHandler: function(event) {
		let node = event.target;
		if(event.button === 1 || ('tagName' in node && node.tagName == 'menu')) {
			this.commandHandler(event);
		}
	},
	commandHandler: function(event) {
		let {target} = event;
		let {ownerDocument: document} = target;
		let {defaultView: window} = document;
		let {gBrowser, gContextMenu} = window;

		let {engine} = target;
		let text = this.searchTerms(window) || this.getSelection(window);
		if(!engine || !text)
			return;

		let submission = engine.getSubmission(text, null);
		if(!submission)
			return;

		let context = document.getElementById('contentAreaContextMenu');

		let inBackground = prefs.get('browser.search.context.loadInBackground', false);
		let relatedToCurrent = prefs.get('browser.tabs.insertRelatedAfterCurrent', true);

		if(event.button === 1 || (event.ctrlKey || event.metaKey))
			inBackground = !inBackground;

		if(inBackground && prefs.get('browser.sessionstore.restore_on_demand', true)) {
			let ellipsis = (gContextMenu && gContextMenu.ellipsis) ? gContextMenu.ellipsis : '\u2026';
			if(event.shiftKey) {
				event.stopPropagation();
				event.preventDefault();
			}
			else {
				context.hidePopup();
			}
			return this.loadTabOnDemand(window, submission.uri.spec, engine, text, relatedToCurrent, ellipsis);
		}
		context.hidePopup();
		gBrowser.loadOneTab(submission.uri.spec, {
			postData: submission.postData,
			relatedToCurrent: relatedToCurrent,
			inBackground: inBackground
		});
	},
	loadTabOnDemand: function(window, url, engine, text, relatedToCurrent, ellipsis) {
		let {gBrowser} = window;

		let tab = gBrowser.addTab(null, {relatedToCurrent: relatedToCurrent});
		let title = ((text.length > 56) ? text.slice(0,55)+ellipsis : text) +' - '+ engine.name;
		gSessionStore.setTabState(tab, JSON.stringify({
			entries: [
				{ title: title }
			],
			userTypedValue: url,
			userTypedClear: 2,
			lastAccessed: tab.lastAccessed,
			index: 1,
			hidden: false,
			attributes: {},
			image: (engine.iconURI ? engine.iconURI.spec : null)
		}));
	},

	searchTerms: function(window) {
		let {document} = window;

		let searchSelect = document.getElementById('context-searchselect');
		if(!searchSelect || !searchSelect.searchTerms)
			return null;
		return searchSelect.searchTerms;
	},
	getSelection: function(window) {
		let {document, gContextMenuContentData, BrowserUtils} = window;

		if('gContextMenuContentData' in window) {
			return gContextMenuContentData.selectionInfo.text;
		}
		else if('BrowserUtils' in window) {
			return BrowserUtils.getSelectionDetails(window).text;
		}
		let fe = document.commandDispatcher.focusedElement;
		if(fe) try {
			return fe.value.substring(fe.selectionStart, fe.selectionEnd);
		}
		catch(ex) {};
		return document.commandDispatcher.focusedWindow.getSelection();
	},

	createSearchMenu: function(window) {
		let {document} = window;

		let menu = document.createElement('menu');
		menu.setAttribute('id', this.nodeIDs.searchMenu);
		menu.setAttribute('class', 'menu-iconic');
		menu.addEventListener('command', this, true);
		menu.addEventListener('click', this, true);

		let popup = document.createElement('menupopup');
		popup.setAttribute('id', this.nodeIDs.searchMenuPopup);
		menu.appendChild(popup);

		let context = document.getElementById('contentAreaContextMenu');
		let searchSelect = document.getElementById('context-searchselect');

		context.insertBefore(menu, searchSelect);

		Services.search.init(function() {
			this.updateSearchMenu(window);
		}.bind(this));
	},
	updateSearchMenu: function(window) {
		let {document} = window;

		let menu = document.getElementById(this.nodeIDs.searchMenu);
		let engine = Services.search.currentEngine || Services.search.defaultEngine;
		menu.engine = engine;
		menu.setAttribute('label', engine.name);
		menu.setAttribute('image', engine.iconURI ? engine.iconURI.spec : defaultImage);

		let popup = document.getElementById(this.nodeIDs.searchMenuPopup);

		for(let last; last = popup.lastChild;)
			last.remove();

		for(let mg of this.menugroups(window))
			popup.appendChild(mg);

		menu.classList[popup.firstChild ? 'remove' : 'add']('popup-is-empty');
	},
	menugroups: function(window) {
		let {document} = window;

		let menugroups = [];

		let pref = prefs.get('browser.search.hiddenOneOffs');
		let hiddenList = pref ? pref.split(',') : [];
		let engines = Services.search.getVisibleEngines().
			filter(function(e) {
				return hiddenList.indexOf(e.name) == -1;
		});
		while(engines.length) {
			let mgList = engines.splice(0, 5);
			let mg = document.createElement('menugroup');
			for(let engine of mgList) {
				let item = document.createElement('menuitem');
				item.setAttribute('tooltiptext', engine.name);
				item.setAttribute('class', 'menuitem-iconic');
				item.setAttribute('src', engine.iconURI ? engine.iconURI.spec : defaultImage);
				item.engine = engine;
				mg.appendChild(item);
			}
			menugroups.push(mg);
		}
		return menugroups;
	},

	SHEET_TYPE: {
	  'agent': 'AGENT_SHEET',
	  'user': 'USER_SHEET',
	  'author': 'AUTHOR_SHEET'
	},
	isTypeValid: function(type) {
		return type in SHEET_TYPE;
	},
	makeCSSURI: function(url) {
		if(!/css$/.test(url))
			url = 'data:text/css,' + encodeURIComponent(url);
		return this.ios.newURI(url, null, null);
	},
	get ios() {
		delete this.ios;
		return this.ios = Services.io;
	},
	getDOMWindowUtils: function(window) {
		return window.QueryInterface(Ci.nsIInterfaceRequestor).
					getInterface(Ci.nsIDOMWindowUtils);
	},
	loadSheet: function(window, url, type) {
		if(!(type && type in SHEET_TYPE))
			type = 'author';
		type = this.SHEET_TYPE[type];
		if(!(url instanceof Ci.nsIURI))
			url = this.makeCSSURI(url);
		let winUtils = this.getDOMWindowUtils(window);
		try {
			winUtils.loadSheet(url, winUtils[type]);
		}
		catch(ex) {};
	},
	removeSheet: function(window, url, type) {
		if(!(type && type in SHEET_TYPE))
			type = 'author';
		type = this.SHEET_TYPE[type];
		if(!(url instanceof Ci.nsIURI))
			url = this.makeCSSURI(url);
		let winUtils = this.getDOMWindowUtils(window);
		try {
			winUtils.removeSheet(url, winUtils[type]);
		}
		catch(ex) {};
	},
	makeCSS: function() {
		return [
			'@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");',
			'#'+this.nodeIDs.searchMenu+' > menupopup > menugroup {',
			'  background-color: menu;',
			'}',
			'#'+this.nodeIDs.searchMenu+' > menupopup > menugroup > .menuitem-iconic {',
			'  padding: 5px;',
			'}',
			'#'+this.nodeIDs.searchMenu+'.popup-is-empty > .menu-right,',
			'#'+this.nodeIDs.searchMenu+'.popup-is-empty > menupopup,',
			'#context-searchselect,',
			'#'+this.nodeIDs.searchMenu+' > menupopup > menugroup > .menuitem-iconic > :-moz-any(.menu-iconic-text, .menu-accel-container) {',
			'  display: none;',
			'}'
		].join('\n');
	}
};
