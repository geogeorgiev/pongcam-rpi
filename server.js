/**
 * Camera Nodejs server application.
 * 
 * By Georgy St. Georgiev, 2017.
 */

'use strict';

// Libs.
const os = require( 'os' );
const path = require( 'path' );
const url = require( 'url' );
const express = require( 'express' );
const ws = require( 'ws' );
const http = require( 'http' );
const https = require( 'https' );
const bodyParser = require( 'body-parser' );
const request = require( 'request' );
const getmac = require( 'getmac' );
const dns = require( 'dns' );
const ls = require( 'node-localstorage' )

// Settings.
const localStorage = new ls.LocalStorage( './scratch' );
const camTokenKey = 'cam_token';
const userTokenKey = 'user_token';
const camKeys = [ 'host', 'hardware_id', 'name', camTokenKey ];
const userKeys = [ 'username', 'password', userTokenKey ];

var port = 8444;
var appServerUrl = localStorage.getItem('app_server_url') || 'http://localhost:8000';
var signalingServerUrl = localStorage.getItem('signaling_server_url') || 'wss://localhost:8443/cam';

// Get host name and port.
function getHost( callback ){
    dns.lookup( os.hostname(), function ( err, host, fam ) {
      callback( host );
    });
}

// Retrieve local information like MAC address and host name and port. 
function getLocalInfo( callback ) {
    getmac.getMac( function( err, hardware_id ) { 
        if ( err ) {
            throw err;
        }
        getHost( function( host ) { 
            const info = { hardware_id: hardware_id, host: host };
            callback( info );
        } );
    } );
}

// Local storage utility fuctions:
// 1)
function setLocalStorageObject( keys, dict ) {
    for ( let key of keys ) {
        if ( dict[ key ] ) {
            localStorage.setItem( key, dict[ key ] );
        }
    }
    return true;
}
// 2) 
function getLocalStorageObject( keys ) {
    var dict = {};
    for ( let key of keys ) {
        dict[ key ] = localStorage.getItem( key );
    }
    return dict;
}
// 3
function removeLocalStorageObject( keys ) {
    for ( let key of keys ) {
        localStorage.removeItem( key );
    }
    return true;
}

// Authenticate user handler.
function authUser( opts, callback ) {
    const form = {
        username: opts.username,
        password: opts.password,
    };
    request( { url: opts.url, form: form, method: 'POST' }, function ( error, response, _user ) {
        console.log( 'headers', response.headers );
        console.log( 'error:', error ); // Print the error if one occurred
        console.log( 'statusCode:', response && response.statusCode ); // Print the response status code if a response was received
        if ( response && response.statusCode == 200 ) {
            var user = {};
            if ( _user ) {
                user = JSON.parse( _user );
            }
            callback( user );
        } else {
            res.status( response.statusCode ).send( 'Server is not happy :|' );
        }
    });
}

// Auth camera handler.
function authCam( opts, callback ) {
    getLocalInfo( function( info ) {
        const user_token = localStorage.getItem( userTokenKey );
        if ( user_token ) {
            const headers = { 'Authorization': 'Token ' + user_token }; 
            const form = {
                name: opts.name,
                hardware_id: info.hardware_id,
                host: info.host,
            };
            request( { url: opts.url, headers: headers, form: form, method: 'POST' }, function ( error, response, _cam) {
                console.log( 'headers', response.headers )
                console.log( 'error:', error ); // Print the error if one occurred
                console.log( 'statusCode:', response && response.statusCode ); // Print the response status code if a response was received
                if ( response && ( response.statusCode == 200 || response.statusCode == 201 ) ) {
                    var cam = {};
                    if ( _cam ) {
                        cam = JSON.parse( _cam );
                    }
                    callback( cam );
                } else {
                    return response.status( response.statusCode ).send( 'Server is not happy :|' );
                }
            } );
        } else {
            console.error( 'User has not authed.' );
        }
    } );
}

function checkAuth() {
    const cam_token = localStorage.getItem( camTokenKey );
    const user_token = localStorage.getItem( userTokenKey );
    const isAuthed = ( ( cam_token != undefined ) && ( user_token != undefined ) );
    console.log( 'Checking auth:' + isAuthed );
    return isAuthed;
}

//
function tryToConnectToSignalingServer() {
    if ( checkAuth() ) {
        console.log( "Authed and ready to stream." );
    } else {
        console.log( "Needs authentication. Go to https://localhost:" + port + " and log in." );
    }
}

// Express app.
var app = express();
app.use( express.static( path.join( __dirname, 'static' ) ) );
app.use( bodyParser.urlencoded( { extended: false } ) );

app.post( '/logout', function( req, res ) {
    removeLocalStorageObject( userKeys );
    removeLocalStorageObject( camKeys );
    console.log('Logout successful.');
    return res.json( { is_authed: false } );
} );

app.get( '/is-authed', function( req, res ) {
    const cam = getLocalStorageObject( camKeys );
    const user = getLocalStorageObject( userKeys );
    const isAuthed = checkAuth();

    if ( isAuthed ) {
        return res.json( { is_authed: isAuthed, cam: cam, user: user } );
    } else {
        return res.json( { is_authed: isAuthed } );
    }
    
} );

app.post( '/auth', function( req, res ) { 
    const opts = req.body;
    const userAuthUrl = appServerUrl + '/api-token-auth';
    const camRegistrationUrl = appServerUrl + '/cams';
    const userOpts = {
        username: opts.username,
        password: opts.password,
        url: userAuthUrl,
    };
    const camOpts = {
        name: opts.name,
        url: camRegistrationUrl,
    };
    authUser( userOpts, function ( user ) {
        console.log( 'Authed user:' );
        console.log( user );
        user.username = opts.username;
        user.user_token = user.token;
        delete user.token;
        setLocalStorageObject( userKeys, user );
        authCam( camOpts, function( cam ) {
            console.log( 'Authed cam:' );
            console.log( cam );
            cam.cam_token = cam.token;
            delete cam.token;
            setLocalStorageObject( camKeys, cam );
            tryToConnectToSignalingServer();
            return res.status( 200 ).json( { cam: cam, user: user } );
        } );
    } );
} );

app.listen( port, function( err ) {
    if ( err ) {
        throw err;
    }
    console.log( 'Cam server started @ http://localhost:' + port + '.' );
    tryToConnectToSignalingServer();
} );


