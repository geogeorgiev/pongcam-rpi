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
const config = require('config');
const utils = require( './libs/utils.js' );

// Settings.
const camTokenKey = 'cam_token';
const userTokenKey = 'user_token';
const camKeys = [ 'host', 'hardware_id', 'name', camTokenKey ];
const userKeys = [ 'username', userTokenKey ];

const env = process.env.NODE_ENV
const localStorage = new ls.LocalStorage( config.LOCAL_STORAGE_DIR + "/" + env );
const store = new utils.Storage( localStorage );

const localServerUrlDict = url.parse( config.LOCAL_API.base )
const port = localServerUrlDict.port;

const appServerUrl = config.APP_API.base;
const authUrl = appServerUrl + config.APP_API.auth;
const camsUrl = appServerUrl + config.APP_API.cams;
    
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
            let info = { hardware_id: hardware_id, host: host };
            callback( info );
        } );
    } );
}

// Authenticate user handler.
function authUser( opts, httpClient, callback ) {
    let form = {
        username: opts.username,
        password: opts.password,
    };
    httpClient( { url: opts.url, form: form, method: 'POST' }, function ( error, response, _user ) {
        if ( response && response.statusCode == 200 ) {
            let user = {};
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
function authCam( opts, httpClient, callback ) {
     getLocalInfo( function( info ) {
        if ( opts.user_token ) {
            let  form = {
                name: opts.name,
                hardware_id: info.hardware_id,
                host: info.host,
            };
            const headers = { 'Authorization': 'Token ' + opts.user_token }; 
            httpClient( { url: opts.url, headers: headers, form: form, method: 'POST' }, function ( error, response, _cam) {
                if ( response && ( response.statusCode == 200 || response.statusCode == 201 ) ) {
                    let cam = {};
                    if ( _cam ) {
                        cam = JSON.parse( _cam );
                    }
                    callback( cam );
                } else {
                    return response.status( response.statusCode ).send( 'Server is not happy :|' );
                }
            });
        } else {
            console.error( 'User has not authed.' );
        }
    });
}

// Check if tokens are available and hence user and cam are authed.
function checkAuth(store) {
    let  cam_token = store.getItem( camTokenKey );
    let  user_token = store.getItem( userTokenKey );
    let  isAuthed = ( ( cam_token != undefined ) && ( user_token != undefined ) );
    return isAuthed;
}

// Try to connect to signaling server.
function tryToConnectToSignalingServer() {
    if ( checkAuth( store ) ) {
        console.log( "Authed and ready to stream." );
    } else {
        console.log( "Needs authentication. Go to https://localhost:" + port + " and log in." );
    }
}

// Express app.
let app = express();
app.use( express.static( path.join( __dirname, 'static' ) ) );
app.use( bodyParser.json() );                                     
app.use( bodyParser.urlencoded( { extended: true } ) );               
app.use( bodyParser.text() );                                    
app.use( bodyParser.json( { type: 'application/json' } ) );  

app.httpClient = request;

app.route( '/auth' )
    .get( function( req, res ) {
        let  cam = store.getLocalStorageObject( camKeys );
        let  user = store.getLocalStorageObject( userKeys );
        let  isAuthed = checkAuth( store );
        if ( isAuthed ) {
            return res.json( { is_authed: isAuthed, cam: cam, user: user } );
        } else {
            return res.json( { is_authed: isAuthed } );
        }
    })
    .delete( function( req, res ) { 
        store.removeLocalStorageObject( userKeys );  
        store.removeLocalStorageObject( camKeys );
        return res.json( { is_authed: false } );
    })
    .post( function( req, res ) { 
        let body = req.body;
        let opts = {};
        opts.user = {
            username: body.username,
            password: body.password,
            url: authUrl,
        };
        opts.cam = {
            name: body.name,
            url: camsUrl,
        };
        authUser( opts.user, app.httpClient, function ( user ) {
            user.user_token = user.token;
            user.username = opts.user.username;
            opts.cam.user_token = user.token;
            authCam( opts.cam, app.httpClient, function( cam ) {
                cam.cam_token = cam.token;
                delete user.token;
                delete cam.token;
                store.setLocalStorageObject( userKeys, user );
                store.setLocalStorageObject( camKeys, cam );
                let  isAuthed = checkAuth( store );
                return res.json( { is_authed: isAuthed, cam: cam, user: user } );
            });
            
        });
    });

app.listen( port, function( err ) {
    if ( err ) {
        throw err;
    }
    console.log( 'Cam server started @ http://localhost:' + port + '.' );
    //tryToConnectToSignalingServer();
} );

module.exports = { 
    app: app,
    store: store,
    httpClient: request,
    checkAuth: checkAuth
}; // for testing
