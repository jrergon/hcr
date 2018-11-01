# hcr

The Hcr helps you to grab some data on the web page. It allows you to crawl all site recursively. It supports limiting requests, adding custom headers and converting html to object as you wish. 

## Depencies

- [bottleneck](https://github.com/SGrondin/bottleneck),
- [request](https://github.com/request/request),
- [cheerio](https://github.com/cheeriojs/cheerio),
- [valid-url](https://github.com/ogt/valid-url),
- [md5](https://github.com/pvorb/node-md5),
- [mocha](https://github.com/mochajs/mocha),
- [chai](https://github.com/chaijs/chai),

## Getting Started

There is an example config that you can modify and use. 
The callback argument that you passed to constructor is default callback for all functions.
	
### Installation

`hcr` is available on [npm](http://npmjs.org). To install it, type:

    $ npm install hcr

### Usage

```js
var opts = {
	reservoir: 100,
  	reservoirRefreshInterval: 60 * 1000 
};

var crawler = new Crawler(opts, callback);

crawler.getPage(['site1.com', 'site2.com']);
```

```js
var opts = {
	reservoir: 100,
  	reservoirRefreshInterval: 60 * 1000 
};

var crawler = new Crawler(opts, callback);

var object = {
	'Name': {
		selector: '#name',
		func: 'text'
	},
	'Image': {
		selector: '#image',
		func: 'attr',
		args: ['src']
	}
};

crawler.toObject(['site1.com', 'site2.com'], object);
```

```js
var opts = {
	reservoir: 100,
  	reservoirRefreshInterval: 60 * 1000 
};

var crawler = new Crawler(opts, callback);

var object = {
	'Name': {
		selector: '#name',
		func: 'text'
	},
	'Image': {
		selector: '#image',
		func: 'attr',
		args: ['src']
	}
};

crawler.recursiveToObject(['site1.com', 'site2.com'], object);
```