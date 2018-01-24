const _BASE = require( '../config/default.js' );

const scriptName = _BASE.path.basename(__filename);

const cheerio = require('cheerio')
const TABLE = 'BOARD';

const NEXT_ELEMENT_DELAY = 1000 * 0.25;

_BASE.connection.end();

var host = '', 
	user = '', 
	password = '', 
	database = '';
_BASE.handleDisconnect( host, user, password, database );

var insertToBoard = function( _item ) {
	_item.title = _item.title.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,"").replace(/&#(\d+);/g, function(_, $1) {
		  return String.fromCharCode($1);
	}).trim();
	_item.contents = _item.contents.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,"").replace(/&#(\d+);/g, function(_, $1) {
		  return String.fromCharCode($1);
	}).trim();
	
    _BASE.dbInsert(
        TABLE,
        _item,
        {
            params: _item,
            success: function( __item ) {
                console.log( "Insert : " );
                console.log( __item );
            }
            /*
            ,
            duplicate: function( __item ) {
                for ( var k in __item ) {
                    __item[k] = ( Number.isInteger( __item[k] ) ) ? __item[k] : "'" + __item[k] + "'";
                }
                _BASE.dbUpdate( 'UPDATE ' + TABLE + ' SET ? WHERE source = ? AND external_key = ?', __item, [__item.source, __item.external_key] );
            }
            */
        }
    );
}


var __upbitNotice = function( list, index ) {
	if ( index < list.length ) {
        var item = list[index];
        var _item = {};
        _item.source = 'UPBIT';
        _item.external_key = item.id;
        _item.link = 'https://upbit.com/service_center/notice?id=' + _item.external_key;
        
        var link = 'https://api-manager.upbit.com/api/v1/notices/' + _item.external_key;

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
                        _BASE.https.get( link, ( resp ) => {
                            let data = '';

							resp.on('data', (chunk) => {
                                data += chunk;
							});

							resp.on('end', () => {
								try {
									data = JSON.parse( data );
									if ( data.success ) {
										_item.title = data.data.title;
										_item.contents = data.data.body;
										_item.created_at = data.data.created_at.substring( 0, 19 ).replace( 'T', ' ' );
		                        		_item.updated_at = data.data.updated_at.substring( 0, 19 ).replace( 'T', ' ' );
		                        		_item.img = 'https://static.upbit.com/upbit-pc/seo/upbit_facebook.png';
										
										insertToBoard( _item );
		                        		setTimeout(__upbitNotice, NEXT_ELEMENT_DELAY, list, index + 1);
									} else {
										console.log( "upbitNotice item response Error" );
									}
								} catch( err ){
									console.log( "upbitNotice item JSON Error" );
									console.log( data );
									console.log( err );
								}
							});
						}).on("error", (err) => {
								console.log( "upbitNotice item Error" );
							console.log( err );
						});
                    } else
                        console.log( "finish upbitNotice" );
                }
            }
        );
	}
}
var upbitNotice = function() {
	var source = 'UPBIT';
	var params = {page:1,per_page:10};
	_BASE.https.get( 'https://api-manager.upbit.com/api/v1/notices?' + _BASE.querystring.stringify( params ), ( resp ) => {
		let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
			try {
				data = JSON.parse( data );
				if ( data.success ) {
                    __upbitNotice( data.data.list, 0 );
				} else {
					console.log( "upbitNotice response Error" );
				}
			} catch( err ){
				console.log( "upbitNotice JSON Error" );
				console.log( data );
				console.log( err );
			}
		});
	}).on("error", (err) => {
		console.log( "upbitNotice Error" );
		console.log( err );
	});
}


var __bithumbNotice = function( list, index ) {
	if ( index < list.length ) {
        var item = list[index];
        var _item = {};
        _item.source = 'BITHUMB';
        _item.external_key = item.link.split('/')[4];
        _item.link = item.link;
        _item.title = item.title;
        _item.contents = item.description;
        var d = new Date( item.pubDate );
		_item.created_at = _BASE.timeToDate( d.getTime() );
		_item.updated_at = _item.created_at;
		_item.img = 'http://bithumb.cafe/wp-content/uploads/2017/08/빗썸-공지사항-1.png';

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
						insertToBoard( _item );
                		setTimeout(__bithumbNotice, NEXT_ELEMENT_DELAY, list, index + 1);
                    } else
                        console.log( "finish bithumbNotice" );
                }
            }
        );
	}
}
var bithumbNotice = function() {
    _BASE.http.get( 'http://bithumb.cafe/feed', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
			var parsedXML = xml.parse( data );
			__bithumbNotice( parsedXML.rss.channel.item, 0 );
		});
	}).on("error", (err) => {
		console.log( "bithumbNotice Error" );
		console.log( err );
	});
}


var __coinoneNotice = function( $article, index ) {
    if ( index < $article.length ) {
        var obj = $article.eq( index );
        var _item = {};
        _item.source = 'COINONE';
        _item.external_key = obj.find('a').attr( 'href' ).split('/')[3];
        _item.title = obj.find('.card_summary_title').text().trim();
        _item.link = 'https://coinone.co.kr' + obj.find('a').attr( 'href' );
        _item.created_at = obj.find('.card_time').attr('time-source').substring( 0, 19 ).replace( 'T', ' ' );
        _item.updated_at = _item.created_at;
        _item.img = 'https://s3.ap-northeast-2.amazonaws.com/coinone-cloudflare-landing/open_graph_logo.png';

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
						insertToBoard( _item );
                		setTimeout(__coinoneNotice, NEXT_ELEMENT_DELAY, $article, index + 1)
                    } else
                        console.log( "finish coinoneNotice" );
                }
            }
        );
    }
}
var coinoneNotice = function() {
    _BASE.https.get( 'https://coinone.co.kr/talk/notice/', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
            const $ = cheerio.load( data );
    		__coinoneNotice( $('article'), 0 );
		});
	}).on("error", (err) => {
		console.log( "coinoneNotice Error" );
		console.log( err );
	});
}

var __binanceNotice = function( $article, index ) {
    if ( index < $article.length ) {
        var obj = $article.eq( index );
        var _item = {};
        _item.source = 'BINANCE';
        _item.external_key = obj.find('a').attr( 'href' ).split('/')[4].split('-')[0];
        _item.link = 'https://support.binance.com' + obj.find('a').attr( 'href' );

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
                        _BASE.https.get( _item.link, ( resp ) => {
                            let data = '';

							resp.on('data', (chunk) => {
                                data += chunk;
							});

							resp.on('end', () => {
								const $ = cheerio.load( data );
								_item.title = $('.article-title').text().trim();
								_item.contents = $('.article-body').text().trim();
						        var d = new Date( $('time').attr('datetime') );
								_item.created_at = _BASE.timeToDate( d.getTime() );
                        		_item.updated_at = _item.created_at;
                        		_item.img = 'http://p13.zdassets.com/hc/settings_assets/1938355/115000012391/vDJ3jjZnVdU1CzsxaiuY6w-logo-en_svg-01.svg';

								insertToBoard( _item );
                        		setTimeout(__binanceNotice, NEXT_ELEMENT_DELAY, $article, index + 1)
							});
						}).on("error", (err) => {
								console.log( "binanceNotice item Error" );
							console.log( err );
						});
                    } else
                        console.log( "finish binanceNotice" );
                }
            }
        );
    }
}

var binanceNotice = function() {
    _BASE.https.get( 'https://support.binance.com/hc/en-us/sections/115000106672-New-Listings', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
            const $ = cheerio.load( data );
            __binanceNotice( $('.article-list-item'), 0 );
		});
	}).on("error", (err) => {
		console.log( "binanceNotice Error" );
		console.log( err );
	});
}

var __bitfinexNotice = function( $article, index ) {
    if ( index < $article.length ) {
        var obj = $article.eq( index );
        var _item = {};
        _item.source = 'BITFINEX';
        _item.external_key = obj.attr('id');
        _item.link = obj.find('a').attr( 'href' );

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
                        _BASE.http.get( _item.link, ( resp ) => {
                            let data = '';

							resp.on('data', (chunk) => {
                                data += chunk;
							});

							resp.on('end', () => {
								const $ = cheerio.load( data );
								_item.title = $('h2').text().trim();
								_item.contents = '';
								$('.post_text_inner p').each( function() {
									_item.contents += $(this).text();
								});
						        var d = new Date( $('meta[property="article:published_time"]').attr('content') );
								_item.created_at = _BASE.timeToDate( d.getTime() );
                        		_item.updated_at = _item.created_at;
                        		_item.img = $('meta[property="og:image"]').attr('content');

								insertToBoard( _item );
                        		setTimeout(__bitfinexNotice, NEXT_ELEMENT_DELAY, $article, index + 1)
							});
						}).on("error", (err) => {
								console.log( "bitfinexNotice item Error" );
							console.log( err );
						});
                    } else
                        console.log( "finish bitfinexNotice" );
                }
            }
        );
    }
}

var bitfinexNotice = function() {
    _BASE.http.get( 'http://blog.bitfinex.com/category/announcements/', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
            const $ = cheerio.load( data );
            __bitfinexNotice( $('article'), 0 );
		});
	}).on("error", (err) => {
		console.log( "bitfinexNotice Error" );
		console.log( err );
	});
}

var __huobiNotice = function( list, index ) {
	if ( index < list.length ) {
        var item = list[index];
        var _item = {};
        _item.source = 'HUOBI';
        _item.external_key = item.id;
        _item.link = 'https://www.huobi.pro/notice_detail/?id=' + _item.external_key;
        
        var link = 'https://www.huobi.com/p/api/contents/pro/notice/' + _item.external_key;

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
                        _BASE.https.get( link, ( resp ) => {
                            let data = '';

							resp.on('data', (chunk) => {
                                data += chunk;
							});

							resp.on('end', () => {
								try {
									data = JSON.parse( data );
									if ( data.success ) {
										_item.title = data.data.title;
										$contents = cheerio.load( data.data.content );
										_item.contents = $contents.text().trim();
										_item.created_at = _BASE.timeToDate(data.data.created);
		                        		_item.updated_at = _item.created_at;
		                        		_item.img = 'https://www.huobi.pro/assets/fonts/logo.svg';
										
										insertToBoard( _item );
		                        		setTimeout(__huobiNotice, NEXT_ELEMENT_DELAY, list, index + 1);
									} else {
										console.log( "huobiNotice item response Error" );
									}
								} catch( err ){
									console.log( "huobiNotice item JSON Error" );
									console.log( data );
									console.log( err );
								}
							});
						}).on("error", (err) => {
								console.log( "huobiNotice item Error" );
							console.log( err );
						});
                    } else
                        console.log( "finish huobiNotice" );
                }
            }
        );
	}
}

var huobiNotice = function() {
    _BASE.https.get( 'https://www.huobi.com/p/api/contents/pro/list_notice?limit=10&language=en-us', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
			try {
				data = JSON.parse( data );
				if ( data.success ) {
                    __huobiNotice( data.data.items, 0 );
				} else {
					console.log( "huobiNotice response Error" );
				}
			} catch( err ){
				console.log( "huobiNotice JSON Error" );
				console.log( data );
				console.log( err );
			}
		});
	}).on("error", (err) => {
		console.log( "huobiNotice Error" );
		console.log( err );
	});
}

var __okexNotice = function( $article, index ) {
    if ( index < $article.length ) {
        var obj = $article.eq( index );
        var _item = {};
        _item.source = 'OKEX';
        _item.external_key = obj.find('a').attr( 'href' ).split('/')[4].split('-')[0];
        _item.link = 'https://support.okex.com' + obj.find('a').attr( 'href' );

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
                        _BASE.https.get( _item.link, ( resp ) => {
                            let data = '';

							resp.on('data', (chunk) => {
                                data += chunk;
							});

							resp.on('end', () => {
								const $ = cheerio.load( data );
								_item.title = $('.article-title').text().trim();
								_item.contents = $('.article-body').text().trim();
						        var d = new Date( $('time').attr('datetime') );
								_item.created_at = _BASE.timeToDate( d.getTime() );
                        		_item.updated_at = _item.created_at;
                        		_item.img = 'http://p13.zdassets.com/hc/settings_assets/2040249/115000086152/xmI1pAYtasqzGelCXq8huA-OKEx_logo___Subtitle.svg';

								insertToBoard( _item );
                        		setTimeout(__okexNotice, NEXT_ELEMENT_DELAY, $article, index + 1)
							});
						}).on("error", (err) => {
								console.log( "okexNotice item Error" );
							console.log( err );
						});
                    } else
                        console.log( "finish okexNotice" );
                }
            }
        );
    }
}

var okexNotice = function() {
    _BASE.https.get( 'https://support.okex.com/hc/en-us/sections/115000447632-Announcement', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
            const $ = cheerio.load( data );
            __okexNotice( $('.article-list-item'), 0 );
		});
	}).on("error", (err) => {
		console.log( "okexNotice Error" );
		console.log( err );
	});
}

var __gdaxNotice = function( list, index ) {
	if ( index < list.length ) {
        var item = list[index];
        var _item = {};
        _item.source = 'GDAX';
        _item.external_key = item.guid.split('/')[4];
        _item.link = item.guid;
        _item.title = item.title;
        $contents = cheerio.load( item['content:encoded'] );
		_item.contents = $contents.text().trim();
        var d = new Date( item.pubDate );
		_item.created_at = _BASE.timeToDate( d.getTime() );
		_item.updated_at = _item.created_at;
		_item.img = ( $contents('img').length ) ? $contents('img').attr('src') : 'https://www.gdax.com/assets/gdax-card.d1bb192f4459bf2fa0aad1087b851bc1.jpg';

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
						insertToBoard( _item );
                		setTimeout(__gdaxNotice, NEXT_ELEMENT_DELAY, list, index + 1);
                    } else
                        console.log( "finish gdaxNotice" );
                }
            }
        );
	}
}

var gdaxNotice = function() {
    _BASE.https.get( 'https://blog.gdax.com/feed', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
			var parsedXML = xml.parse( data );
			__gdaxNotice( parsedXML.rss.channel.item, 0 );
		});
	}).on("error", (err) => {
		console.log( "gdaxNotice Error" );
		console.log( err );
	});
}

var __kucoinNotice = function( list, index ) {
	if ( index < list.length ) {
        var item = list[index];
        var _item = {};
        _item.source = 'KUCOIN';
        _item.external_key = item.guid.split('p=')[1];
        _item.link = item.link;
        _item.title = item.title;
        _item.contents = item.description;
        var d = new Date( item.pubDate );
		_item.created_at = _BASE.timeToDate( d.getTime() );
		_item.updated_at = _item.created_at;		
		
		_BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
                        _BASE.https.get( _item.link, ( resp ) => {
                            let data = '';

							resp.on('data', (chunk) => {
                                data += chunk;
							});

							resp.on('end', () => {
								const $ = cheerio.load( data );
								_item.img = ( $('article').find('img').length ) ? $('article').find('img').attr('src') : 'https://assets.kucoin.com/www/1.4.7/static/logo_v.1.0.a0267de6.svg';

								insertToBoard( _item );
                        		setTimeout(__kucoinNotice, NEXT_ELEMENT_DELAY, list, index + 1)
							});
						}).on("error", (err) => {
							console.log( "kucoinNotice item Error" );
							console.log( err );
						});
                    } else
                        console.log( "finish kucoinNotice" );
                }
            }
        );
	}
}

var kucoinNotice = function() {
    _BASE.https.get( 'https://news.kucoin.com/en/feed/', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
			var parsedXML = xml.parse( data );
			__kucoinNotice( parsedXML.rss.channel.item, 0 );
		});
	}).on("error", (err) => {
		console.log( "kucoinNotice Error" );
		console.log( err );
	});
}

var __bittrexNotice = function( $article, index ) {
    if ( index < $article.length ) {
        var obj = $article.eq( index );
        var _item = {};
        _item.source = 'BITTREX';
        _item.external_key = obj.find('a').attr( 'href' ).split('/')[4].split('-')[0];
        _item.link = 'https://support.bittrex.com' + obj.find('a').attr( 'href' );

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
                    if (items.length == 0) {
                        _BASE.https.get( _item.link, ( resp ) => {
                            let data = '';

							resp.on('data', (chunk) => {
                                data += chunk;
							});

							resp.on('end', () => {
								const $ = cheerio.load( data );
								_item.title = $('.article__title').text().trim();
								_item.contents = $('.article__body markdown').text().trim();
								_item.created_at = $('time').attr('datetime').substring( 0, 19 ).replace( 'T', ' ' );
                        		_item.updated_at = _item.created_at;

								insertToBoard( _item );
                        		setTimeout(__bittrexNotice, NEXT_ELEMENT_DELAY, $article, index + 1)
							});
						}).on("error", (err) => {
								console.log( "bittrexNotice item Error" );
							console.log( err );
						});
                    } else
                        console.log( "finish bittrexNotice" );
                }
            }
        );
    }
}

var bittrexNotice = function() {
    _BASE.https.get( 'https://support.bittrex.com/hc/en-us/sections/203283828-Information', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {console.log(data);
            const $ = cheerio.load( data );
            __bittrexNotice( $('.article-list-item'), 0 );
		});
	}).on("error", (err) => {
		console.log( "bittrexNotice Error" );
		console.log( err );
	});
}


console.log( '------------------START( ' + __filename + ' )------------------' );

var startCrawling = function() {
	upbitNotice();
	bithumbNotice();
	//coinoneNotice();
	binanceNotice();
	bitfinexNotice();
	huobiNotice();
	okexNotice();
	gdaxNotice();
	kucoinNotice();
	//bittrexNotice();	
}

setInterval( startCrawling, 1000 * 45 );
startCrawling();