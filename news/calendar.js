const _BASE = require( '../config/default.js' );

const scriptName = _BASE.path.basename(__filename);

const cheerio = require('cheerio')
const xml = require('fast-xml-parser');
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


var __coinmarketcal = function( $article, index, page ) {
    if ( index < $article.length ) {
        var obj = $article.eq( index );
        
        var votes = parseInt( obj.find('.votes').text().trim().replace('(', '').split(' ')[0] );
        var percent = parseInt( obj.find('.progress-bar').attr('aria-valuenow').trim() );
        
        if ( votes >= 10 && percent >= 75 ) {        
	        var _item = {};
	        _item.source = 'COINMARKETCAL';
	        _item.external_key = obj.find('.content-box-info').attr( 'id' ).split('-')[1];
	        var d = new Date( obj.find('h5').eq(0).children('strong').text() );
	        var addDateInfo = obj.find('h5').eq(0).text().trim().replace( obj.find('h5').eq(0).children('strong').text().trim(), '' );
	        _item.title = obj.find('h5').eq(1).text().trim() + ' / ' + _BASE.timeToDate( d.getTime(), true ) + addDateInfo + ' / ' + obj.find('h5').eq(2).text().trim();
	        _item.created_at = _BASE.timeToDate();
	        _item.updated_at = _item.created_at;
	        _item.contents = obj.find('.description').text().trim();
	        if ( obj.find('.content-box-info > a').length < 2 ) {
	        	_item.img = '';
	        	_item.link = '';

	        	if ( obj.find('.content-box-info > a').eq(0).attr('data-featherlight') == 'image' )
                    _item.img = 'https://www.coinmarketcal.com' + obj.find('.content-box-info > a').eq(0).attr('href');
	        	else
	        		_item.link = obj.find('.content-box-info > a').eq(0).attr('href');
			} else {
                _item.link = obj.find('.content-box-info > a').eq(1).attr('href');
                _item.img = 'https://www.coinmarketcal.com' + obj.find('.content-box-info > a').eq(0).attr('href');
			}
	
	        _BASE.dbSelect(
	            'SELECT * FROM ' + TABLE + ' WHERE source = ? AND external_key = ? LIMIT 1',
	            [_item.source, _item.external_key],
	            {
	                params: _item,
	                success: function ( items, params ) {
	                    if (items.length == 0) {
							insertToBoard( _item );
	                    }
                		setTimeout(__coinmarketcal, NEXT_ELEMENT_DELAY, $article, index + 1, page);
	                }
	            }
	        );
        } else {
    		setTimeout(__coinmarketcal, NEXT_ELEMENT_DELAY, $article, index + 1, page);        	
        }
    } else
		setTimeout(coinmarketcal, NEXT_ELEMENT_DELAY * 4, page + 1)
}
var coinmarketcal = function( page ) {
	if ( page > 3 ) {
		console.log( "finish coinmarketcal" );
		return;
	}
	
    _BASE.https.get( 'https://www.coinmarketcal.com/?form%5Bmonth%5D=&form%5Byear%5D=&form%5Bsort_by%5D=created_desc&form%5Bsubmit%5D=&page=' + page, ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
            const $ = cheerio.load( data );
            __coinmarketcal( $('article'), 0, page );
		});
	}).on("error", (err) => {
		console.log( "coinmarketcal Error" );
		console.log( err );
	});
}


console.log( '------------------START( ' + __filename + ' )------------------' );

var startCrawling = function() {
	coinmarketcal( 1 );
}

setInterval( startCrawling, 1000 * 60 );
startCrawling();