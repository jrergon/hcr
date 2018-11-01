var request = require('request');
const cheerio = require('cheerio');
var Bottleneck = require('bottleneck');
var md5 = require('md5');
var validUrl = require('valid-url');

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
			var args = object[key].args;
			if(args) {
				responseObject[key] = $$(selector)[func](...args);
			}else {
				responseObject[key] = $$(selector)[func]();
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

		const $$ = cheerio.load(body);
		var responseObject = {};

		for(var key in object) {
			var selector = object[key].selector;
			var func = object[key].func;
			var args = object[key].args;

			if(args) {
				responseObject[key] = $$(selector)[func](...args);
			}else {
				responseObject[key] = $$(selector)[func]();
			}
		}

		self.callback(err, response, responseObject);

		var links = getLinks(body);
		
		self.recursiveToObject(links, object);
	};

	for(var i = 0; i < parseList.length; i++) {
		if(this.parsedPages[parseList[i]] != true) {
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

var getLinks = function(body) {
	const $$ = cheerio.load(body);
	var links = [];
	
	$$('a').each(function() {
		var url = this.attribs.href;
		if(validUrl.isUri(url)) {
			links.push(this.attribs.href); 
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