exports.mysql			= require('mysql');
exports.connection;

exports.handleDisconnect = function( host, user, password, database ) {
	exports.connection = exports.mysql.createConnection({
		host		 : host,
		user		 : user,
		password : password,
		database : database
	});
	
	exports.connection.on('error', function(err) {
		console.log( "DB connection error : " + err );
		if(err.code === 'PROTOCOL_CONNECTION_LOST') {
			exports.handleDisconnect( host, user, password, database );
		} else {
			throw err;
		}
	});
}
exports.handleDisconnect();

exports.WebSocket = require('ws');
exports.ws;

exports.https = require('https');
exports.http = require('http');
require('ssl-root-cas').inject();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

exports.path = require('path');

exports.request = require('request');

exports.querystring = require('querystring');

exports.urlparse = require('url-parse');

exports.timeToDate = function( timestamp ) {
	var date;
	if ( timestamp ) 
		date = new Date( parseInt( timestamp ) );
	else
		date = new Date();

	return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
}

exports.dbInsert = function( table, data, callback ) {
	var query = exports.connection.query( "INSERT INTO " + table + " SET ?", data, function( err, result ) {				
		if( err ){
			if ( ( "code" in err ) && err.code == 'ER_DUP_ENTRY' ) {
				if ( callback != undefined && callback.duplicate != undefined )
					callback.duplicate( callback.params );
			} else
                console.log( err );
		} else {
            if ( callback != undefined && callback.success != undefined ) {
                callback.success( callback.params );
			}
		}
	});
}

exports.dbSelect = function( sql, whereData, callback ) {
	var query = exports.connection.query( sql, whereData, function( err, result ) {				
		if( err ){
			console.log( err );
		} else {
			if ( callback != undefined && callback.success != undefined )
				callback.success( result, callback.params );
		}
	});
}

exports.dbUpdate = function( sql, setData, whereData ) {
	var isFirstIndex = true;
	var set = 'SET ';
	for( var field in setData ) {
		set += ( isFirstIndex ? '' : ', ' ) + field + ' = ' + setData[field];
		isFirstIndex = false;
	}
	sql = sql.replace( 'SET ?', set );
    for ( var i = whereData.length - 1; i >= 0; i-- ) {
        sql = sql.replace( /\?(?=[^?]*$)/, whereData[i] );
    }
	
	var query = exports.connection.query( sql, function( err, result ) {
		if( err ){
			console.log( err );
			return false;
		} else {
			return result;
		}
	});
}

var jandiQueue = [];
var ingSendJandi = false;
var tryCntJandi = 0;

exports.sendJandi = function( url, title, data, color ) {	
	var formData = {
		url: url,
		body: title,
		connectColor: ( color == undefined ) ? '#FAC11B' : color,
		connectInfo: [{
			title: title,
			description: ( typeof data === 'string' ) ? data : JSON.stringify( data )
		}]
	}
	jandiQueue.push( formData );
}

var cronSendJandi = function() {
	if ( ingSendJandi || jandiQueue.length == 0 ) {
		if ( tryCntJandi++ > 20 ) {
			ingSendJandi = false;
		}
		return;
	}
	
	console.log( 'send to Jandi' );
	
	ingSendJandi = true;
	tryCntJandi = 0;
	
	var formData = jandiQueue[0];
	var url = formData.url;
	var parsed = exports.urlparse( url );
	delete formData.url;

	var options = {
		host: parsed.hostname,
		path: parsed.pathname,
		method: 'POST',
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/vnd.tosslab.jandi-v2+json"
		}
	};
	
	var req = exports.https.request( options, function( res ) {
		res.setEncoding('utf8');
		res.on('data', function (body) {
			console.log( body );
			var item = jandiQueue.shift();
			ingSendJandi = false;
		});
	});
	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
		ingSendJandi = false;
	});
	req.write( JSON.stringify( formData ) );
	req.end();
}

setInterval( cronSendJandi, 1000 * 0.5 );

var methods = ["log"];//, "warn", "error"];
var method;
for ( var i = 0; i < methods.length; i++ ) {
	method = methods[i];
    var oldMethod = console[method].bind(console);
    console[method] = function() {
        oldMethod.apply(
            console,
            [exports.timeToDate()].concat(arguments)
        );
    };
}