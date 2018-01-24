const _BASE = require( '../config/default.js' );
const scriptName = _BASE.path.basename(__filename);

const cheerio = require('cheerio')

var coinmarketCapDetail = function (COINNAME) {
	_BASE.https.get( 'https://coinmarketcap.com/currencies/' + COINNAME + '/', ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
            const $ = cheerio.load( data );
            var datas = [];
            $('#markets-table tbody tr').each(function(i,obj){
            	var childs = $(obj).children();
            	
            	var data = {
            		'source' : childs.eq(1).text().trim(),
            		'pair' : childs.eq(2).text().trim(),
            		'volume24h' : childs.eq(3).text().trim(),
            		'price' : childs.eq(4).text().trim(),
            		'volume' : childs.eq(5).text().trim()
            	};
            	datas.push(data);
            	
            	//datas 
            });
       });
	}).on("error", (err) => {
		console.log( "COIN MARKET CAP Error" );
		console.log( err );
	});
}

var coinmarketCapList = function(page) {
	var limit = 100;
	if(!page) page = 0;
	
	var start = page * limit;
	
	_BASE.https.get( 'https://api.coinmarketcap.com/v1/ticker/?limit=' + limit + '&start=' + start, ( resp ) => {
        let data = '';

		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
			try {
				var jsondata = JSON.parse( data );
				//coinmarketCapDetail <- jsondata.id
				console.log(jsondata);
			} catch( err ){
				console.log( "coinmarket Cap JSON Error" );
				console.log( data );
				console.log( err );
			}
       });
	}).on("error", (err) => {
		console.log( "COIN MARKET CAP Error" );
		console.log( err );
	});
	
}


//coinmarketCapDetail('bitcoin');
coinmarketCapList(1);