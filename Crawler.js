var request = require('request');
const cheerio = require('cheerio');
var Bottleneck = require('bottleneck');
var md5 = require('md5');
var validUrl = require('valid-url');
var Url = require('url');
var events = require('events');
var util = require('util');

var Crawler = function(options, callback) {
	events.EventEmitter.call( this );
	var self = this;
	this.options = options;
	this.callback = callback;
	this.limiter = new Bottleneck(setLimiterOptions(options));
	this.parsedPages = [];
	this.limiter.on('empty', function(){
		self.emit('completed');
	});
};

Crawler.prototype = new events.EventEmitter;

util.inherits(Crawler, events.EventEmitter);

Crawler.prototype.getPage = function(parseList) {
	for(var i = 0; i < parseList.length; i++) {
		var opts = {
			url: encodeURI(parseList[i]),
			headers: this.options.headers,
			timeout: this.options.timeout
		};
		
		this.limiter.submit(request, opts, this.callback);
	}
};

Crawler.prototype.toObject = function(parseList, object) {
	var self = this;

	var cb = function(err, response, body) {
		if(err) {
			self.callback(err, response, body);
		}

		const $$ = cheerio.load(body);
		var responseObject = {};
		for(var key in object) {
			var selector = object[key].selector;
			var func = object[key].func;
			var prop = object[key].prop;
			var args = object[key].args;

			if(func) {
				if(args) {
					responseObject[key] = $$(selector)[func](...args);
				}else {
					responseObject[key] = $$(selector)[func]();
				}
			}else {
				responseObject[key] = $$(selector)[prop];
			}
		}

		self.callback(err, response, responseObject);
	};

	for(var i = 0; i < parseList.length; i++) {
		var opts = {
			url: encodeURI(parseList[i]),
			headers: this.options.headers,
			timeout: this.options.timeout
		};

		this.limiter.submit(request, opts, cb);
	}
};

Crawler.prototype.recursiveToObject = function(parseList, object) {
	this.limiter.removeAllListeners();
	var self = this;
	
	var cb = function(err, response, body) {
		if(err) {
			self.callback(err, response, body);
		}

		var contentType = response.headers['content-type'].split(' ')[0];
		
		if(contentType.includes('text/html')) {
			const $$ = cheerio.load(body);
			var responseObject = {};

			for(var key in object) {
				var selector = object[key].selector;
				var func = object[key].func;
				var args = object[key].args;
				var prop = object[key].prop;

				if(func) {
					if(args) {
						responseObject[key] = $$(selector)[func](...args);
					}else {
						responseObject[key] = $$(selector)[func]();
					}
				}else {
					responseObject[key] = $$(selector)[prop];
				}
			}

			self.callback(err, response, responseObject);
			var host = response.request.uri.host;
			if(host.includes(':')) {
				host = response.request.uri.host.split(':')[0];
			}

			var links = getLinks(body, response.request.uri.href, host);
			if(links.length < 1 && self.limiter.empty()) {
				self.emit('completed');
			}else {
				self.limiter.on('empty', function(){
					self.emit('completed');
				});
				
				self.recursiveToObject(links, object);
			}
		}
	};

	for(var i = 0; i < parseList.length; i++) {
		if(this.parsedPages[md5(parseList[i])] != true) {
			var opts = {
				url: encodeURI(parseList[i]),
				headers: this.options.headers,
				timeout: this.options.timeout
			};

			this.parsedPages[md5(parseList[i])] = true;
			this.limiter.submit(request, opts, cb);
		}
	}
};

Crawler.prototype.recursiveRegexToObject = function(parseList, regex, object) {
	this.limiter.removeAllListeners();
	var self = this;
	
	var cb = function(err, response, body) {
		if(err) {
			self.callback(err, response, body);
		}

		var contentType = response.headers['content-type'].split(' ')[0];
		
		if(contentType.includes('text/html')) {
			if(response.request.uri.href.match(regex)) {
				const $$ = cheerio.load(body);
				var responseObject = {};

				for(var key in object) {
					var selector = object[key].selector;
					var func = object[key].func;
					var args = object[key].args;
					var prop = object[key].prop;

					if(func) {
						if(args) {
							responseObject[key] = $$(selector)[func](...args);
						}else {
							responseObject[key] = $$(selector)[func]();
						}
					}else {
						responseObject[key] = $$(selector)[prop];
					}
				}

				self.callback(err, response, responseObject);
			}else {
				const $$ = cheerio.load(body);
				var responseObject = {};

				for(var key in object) {
					var selector = object[key].selector;
					var func = object[key].func;
					var args = object[key].args;
					var prop = object[key].prop;

					if(func) {
						if(args) {
							responseObject[key] = $$(selector)[func](...args);
						}else {
							responseObject[key] = $$(selector)[func]();
						}
					}else {
						responseObject[key] = $$(selector)[prop];
					}
				}

				self.callback(err, response, responseObject);
			}
			
			var host = response.request.uri.host;
			if(host.includes(':')) {
				host = response.request.uri.host.split(':')[0];
			}

			var links = getLinks(body, response.request.uri.href, host);
			
			if(links.length < 1 && self.limiter.empty()) {
				self.emit('completed');
			}else {
				self.limiter.on('empty', function(){
					self.emit('completed');
				});

				self.recursiveRegexToObject(links, regex, object);
			}
		}
	};
	
	for(var i = 0; i < parseList.length; i++) {
		if(this.parsedPages[md5(parseList[i])] != true) {
			var opts = {
				url: encodeURI(parseList[i]),
				headers: this.options.headers,
				timeout: this.options.timeout
			};

			this.parsedPages[md5(parseList[i])] = true;
			this.limiter.submit(request, opts, cb);
		}
	}
};

var getLinks = function(body, currentLink, host) {
	const $$ = cheerio.load(body);
	var links = [];
	
	$$('a').each(function() {
		var url = this.attribs.href;
		if(url) {
			var fullPath = Url.resolve(currentLink, url);
			
			if(validUrl.isUri(fullPath) && 
				Url.parse(fullPath).hostname == host) {
				links.push(fullPath); 
			}
		}
	});
	
	return links;
};

var setLimiterOptions = function(options) {
	var opts = {};

	if(options.maxConcurrent) {
		opts.maxConcurrent = options.maxConcurrent;
	}

	if(options.reservoir) {
		opts.reservoir = options.reservoir;
		opts.reservoirRefreshAmount = options.reservoir;
	}

	if(options.reservoirRefreshInterval) {
		opts.reservoirRefreshInterval = options.reservoirRefreshInterval;
	}

	return opts;
};

module.exports = Crawler;