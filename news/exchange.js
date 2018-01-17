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
        _item.title = item.title;
        _item.link = 'https://upbit.com/service_center/notice?id=' + item.id;
        _item.created_at = item.created_at.substring( 0, 19 ).replace( 'T', ' ' );
        _item.updated_at = item.updated_at.substring( 0, 19 ).replace( 'T', ' ' );

        _BASE.dbSelect(
            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
            [_item.source, _item.external_key],
            {
                params: _item,
                success: function ( items, params ) {
					if ( items.length == 0 ) {
                        insertToBoard( _item );
                        setTimeout( __upbitNotice, NEXT_ELEMENT_DELAY, list, index + 1 );
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


var __bithumbNotice = function( $article, index ) {
    if ( index < $article.length ) {
        var obj = $article.eq( index );
        var _item = {};
        _item.source = 'BITHUMB';
        _item.link = obj.find('a').attr( 'href' );
        _item.external_key = obj.attr( 'id' );

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
								_item.title = $('.entry-title').text().trim();
								_item.contents = $('.entry-content').text().trim();
								_item.created_at = $( '.posted-date' ).text().trim();
                        		_item.updated_at = _item.created_at;

								insertToBoard( _item );
                        		setTimeout(__bithumbNotice, NEXT_ELEMENT_DELAY, $article, index + 1)
							});
						}).on("error", (err) => {
								console.log( "bithumbNotice item Error" );
							console.log( err );
						});
                    } else
                        console.log( "finish bithumbNotice" );
                }
            }
        );
    }
}
var bithumbNotice = function() {
	var source = 'BITHUMB';
    _BASE.http.get( 'http://bithumb.cafe/archives/category/notice', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
            const $ = cheerio.load( data );
    		__bithumbNotice( $('article'), 0 );
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
	var source = 'BITHUMB';
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


console.log( '------------------START( ' + __filename + ' )------------------' );

upbitNotice();
bithumbNotice();
//coinoneNotice();