var request = require('request');
const cheerio = require('cheerio');
var Bottleneck = require('bottleneck');
var md5 = require('md5');
var validUrl = require('valid-url');
var Url = require('url');

var Crawler = function(options, callback) {
	this.options = options;
	this.callback = callback;
	this.limitter = new Bottleneck(setLimitterOptions(options));
	this.parsedPages = [];
};

Crawler.prototype.getPage = function(parseList) {
	for(var i = 0; i < parseList.length; i++) {
		var opts = {
			url: encodeURI(parseList[i]),
			headers: this.options.headers,
			timeout: this.options.timeout
		};
		
		this.limitter.submit(request, opts, this.callback);
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

		this.limitter.submit(request, opts, cb);
	}
};

Crawler.prototype.recursiveToObject = function(parseList, object) {
	var self = this;
	
	var cb = function(err, response, body) {
		if(err) {
			self.callback(err, response, body);
		}

		var contentType = response.headers['content-type'].split(' ')[0];
		
		if(contentType == 'text/html;') {
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
			var links = getLinks(body, response.request.uri.href,
				response.request.uri.host);
			
			self.recursiveToObject(links, object);
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
			this.limitter.submit(request, opts, cb);
		}
	}
};

Crawler.prototype.recursiveToObject = function(parseList, regex, object) {
	var self = this;
	
	var cb = function(err, response, body) {
		if(err) {
			self.callback(err, response, body);
		}

		var contentType = response.headers['content-type'].split(' ')[0];
		
		if(contentType == 'text/html;') {
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
			var links = getRegexLinks(body, regex, response.request.uri.href,
				response.request.uri.host);
			
			self.recursiveToObject(links, object);
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
			this.limitter.submit(request, opts, cb);
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

var getRegexLinks = function(body, regex, currentLink, host) {
	const $$ = cheerio.load(body);
	var links = [];
	
	$$('a').each(function() {
		var url = this.attribs.href;
		if(url) {
			var fullPath = Url.resolve(currentLink, url);
			if(validUrl.isUri(fullPath) && 
				Url.parse(fullPath).hostname == host &&
				fullPath.match(regex).length > 0) {
				links.push(fullPath); 
			}
		}
	});
	
	return links;
};

var setLimitterOptions = function(options) {
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