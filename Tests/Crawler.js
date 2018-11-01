/* eslint no-undef: ['off'] */
/* eslint handle-callback-err: ['off'] */

var chai = require('chai');
var expect = chai.expect;
var Crawler = require('./../Crawler');

describe('Hqc - Webcrawler', function() {
	it('getPage', function(done) {
		var opts = {
			maxConcurrent: 1
		};

		var callback = function(err, response, body) {
			expect(response.statusCode).equal(200);

			done();
		};

		var crawler = new Crawler(opts, callback);
		crawler.getPage(['https://google.com']);
	});


	it('toObject', function(done) {
		var opts = {
			maxConcurrent: 1
		};

		var callback = function(err, response, body) {
			expect(response.statusCode).equal(200);
			expect(body).to.be.an('object');
			expect(body.Categories).equal('Tüm Kategoriler');
			expect(body.MyAcc).equal('Hesabım');

			done();
		};

		var object = {
			'MyAcc': {
				selector: '#rise-header > div > div > div:nth-child(4) > div ' +
				' > div > span > button > span.ms-login-logout__button-label',
				func: 'text'
			},
			'Categories': {
				selector: '#rise-header > div > nav.site-navigation2.' + 
				'site-navigation2--dropdown.ms-header2__nav > div.site-' + 
				'navigation2__wrapper > ul > li.site-navigation2__item.' + 
				'site-navigation2__item--primary-toggle > button',
				func: 'data',
				args: ['tracking-nav']
			}
		};

		var crawler = new Crawler(opts, callback);
		crawler.toObject(['https://www.mediamarkt.com.tr/'], object);
	});
});