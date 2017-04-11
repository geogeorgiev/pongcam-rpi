/**
 * Baiivan.
 * By Georgy St. Georgiev, 2017.
 * CameraHandler.js
 */

'use strict';
const LIB_PATH = '../../lib';

const config = require( 'config' );

// Constants
const ID_KEY = "id";
const SDP_OFFER_KEY = 'sdp_offer';
const SDP_ANSWER_KEY = 'sdp_answer';
const START_STREAM_KEY = 'start_stream';
const STOP_STREAM_KEY = 'stop_stream';
const STREAM_ID_KEY = 'stream_token';
const SESSION_ID_KEY = 'session_id';
const CAM_KEY = 'cam';
const USER_KEY = 'user';
const TOKEN_KEY = 'token';

const TYPE_KEY = 'type';
const EXT_KEY = 'ext';
const HAS_LOGGED_IN_KEY = 'has_logged_in';
const USERNAME_KEY = 'username';
const PASSWORD_KEY = 'password';
const NAME_KEY = 'name';
const CAM_TYPE_KEY = 'cam_type';
const CAM_TYPE_VAL = 'raspberry pi';
const CAM_SOFTWARE_VERSION_KEY = 'software_version';
const CAM_SOFTWARE_VERSION_VAL = '0.1';
const HARDWARE_ID_KEY = 'hardware_id';
const HARDWARE_ID = 'hardware_id';
const ENV = process.env.NODE_ENV



const APP_URL = config.APP_API.BASE;
const AUTH_URL = APP_URL + config.APP_API.AUTH;
const CAM_URL = APP_URL + config.APP_API.CAMS;

class AppHandler { 

    constructor( store, client ) {
        this.store = store;
        this.client = client;
    }

    getCam ( req, res ) {
        this._checkAuthInfo( ( err, hasLoggedIn, user ) => { 
            if ( err ) return this._sendError( res, { error: err } );
            if ( !hasLoggedIn || !user || !user[ TOKEN_KEY ] ) {
                return this._send( res, {}, 401 );
            }

            this._requestCamRead( user[ TOKEN_KEY ], ( err, cam ) => {
                if ( err == 401 ) { this._requestLogout(() => {}); }
                if ( err ) return this._sendError( res, { error: err });
                
                this.store.set( CAM_KEY, cam );
                return this._send( res, { cam: cam } );
            });
        });
    }

    postCam ( req, res, method ) {
        this._checkAuthInfo( ( err, hasLoggedIn, user ) => { 
            if ( err ) return this._sendError( res, { error: err } );
            if ( !hasLoggedIn || !user || !user[ TOKEN_KEY ] ) {
                return this._send( res, {}, 401 );
            }

            let body = req.body;
            

            this.store.get( HARDWARE_ID_KEY, ( err, hardwareId ) => {

                let camInfo = {}
                console.log(body)
                camInfo[ NAME_KEY ] = body[ NAME_KEY ];
                camInfo[ HARDWARE_ID ] = hardwareId;
                camInfo[ CAM_TYPE_KEY ] = CAM_TYPE_VAL;
                camInfo[ CAM_SOFTWARE_VERSION_KEY ] = CAM_SOFTWARE_VERSION_VAL;

                this._validateCamInfo( camInfo, ( err ) => {
                    if ( err ) return this._sendError( res, { error: err } );
                    console.log( body )
                    if ( body[ ID_KEY ] ) {
                        console.log('==> Update')
                        camInfo[ ID_KEY ] = body[ ID_KEY ];
                        this._requestCamUpdate( user[ TOKEN_KEY ], camInfo, ( err, data, status ) => {
                            if ( status == 401 ) { this._requestLogout(() => {}); }
                            if ( err ) return this._sendError( res, { error: err } );
                            console.log( status )
                            return this._send( res, { text: "Update has been successful." } );
                        });

                    } else {

                        console.log('==> Create')

                        this._requestCamCreate( user[ TOKEN_KEY ], camInfo, ( err, data, status ) => {
                                
                            if ( status == 401 ) { this._requestLogout(() => {}); }
                            if ( err ) return this._sendError( res, { error: err } );
                            if ( status == 400 ) { return this._sendError( res, { error: 'Cam exists' }, 400 ); }
                            console.log(status)
                            
                            let responseText = {};
                            responseText[ TOKEN_KEY ] = data[ TOKEN_KEY ];
                            return this._send( res, responseText );
                        });
                    }
                })
            })
        });
    }

 
    logIn( req, res ) {
        let body = req.body;
        let userCreds = {}
        userCreds[ USERNAME_KEY ] = body[ USERNAME_KEY ];
        userCreds[ PASSWORD_KEY ] = body[ PASSWORD_KEY ];
        this._validateUserInfo( userCreds, ( err ) => {
            if ( err ) return this._sendError( res, { error: err } );
            this._requestLogIn( userCreds, ( err, user ) => {
                
                if ( err ) return this._sendError( res, {}, err );   
                if ( !user[ TOKEN_KEY ] ) return this._sendError( res, { error: 'Server error' }, 500 ); 

                let userInfo = {}
                userInfo[ TOKEN_KEY] = user[ TOKEN_KEY ];
                userInfo[ USERNAME_KEY ] = body[ USERNAME_KEY ];
                this.store.set( USER_KEY, userInfo );
                this.store.set( HAS_LOGGED_IN_KEY, true );

                delete userInfo[ TOKEN_KEY];
                let responseText = {};
                responseText[ USER_KEY ] = userInfo;
                return this._send( res, responseText );
            });
        });
    }

    
    logOut( req, res ) {
        this._requestLogout( ( err ) => {
            if ( err ) return this._sendError( res, { error: err });
            return this._send( res, { text: "User has been logged out." } );
        })
    }

    hasLoggedIn( req, res ) {
        this._checkAuthInfo( ( err, hasLoggedIn, user ) => {
            if ( err ) return this._sendError( res, { error: err } );
            if ( !hasLoggedIn ) {
                return this._send( res, { error: "Access denied. Has not logged in." }, 403 );
            }

            let userInfo = {}
            userInfo[ USERNAME_KEY ] = user[ USERNAME_KEY ];
            let responseText = {};
            responseText[ USER_KEY ] = userInfo;
            return this._send( res, responseText );
            
            
        });

    }

    _validateUserInfo( userInfo, callback ) {
        if ( !userInfo[ USERNAME_KEY ] || userInfo[ USERNAME_KEY ].length < 1 ) return callback ( 'Invalid username.' );
        if ( !userInfo[ PASSWORD_KEY] || userInfo[ PASSWORD_KEY ].length < 6 ) return callback ( 'Invalid password.' );
        return callback( null );
    }

    _validateCamInfo( camInfo, callback ) {
        if ( !camInfo[ NAME_KEY ] || camInfo[ NAME_KEY ].length < 1 ) return callback ( 'Invalid cam name.' );
        return callback( null );
    }

    _getHardwareSpecs( callback ) {
        getmac.getMac( function( err, hardware_id ) { 
            if ( err ) return callback ( err );
            return callback( null, hardware_id );
        } );
    }

    _requestCamRead( userToken, callback ) {
        console.log(CAM_URL)
        const headers = { 'Authorization': 'Token ' + userToken };
        
        this.client( { url: CAM_URL, headers: headers, method: 'GET' }, ( err, appRes, _cams ) => {
            if ( appRes.statusCode == 403 || appRes.statusCode == 401 || !_cams ) return callback( 401 );
            if ( err ) { console.error( err ); return callback ( 500 ); }
            
            let cams = JSON.parse( _cams ); 
            
            console.log( cams );
            if ( !Array.isArray( cams ) ) return callback ( 'Response is not an array.' );
            
            let cam = null;
            this.store.get( HARDWARE_ID_KEY, ( err, hardware_id ) => {
                
                if ( err ) { console.error( err ); return callback ( 500 ); }
                console.log( hardware_id )
                let i = 0;
                while ( i < cams.length ) {
                    let c = cams[i];
                    if ( c[ HARDWARE_ID ] == hardware_id ) {
                        cam = c;
                        break;
                    }
                    i++;
                }
                return callback( null, cam );
            });
        });
    }

    _requestCamCreate( userToken, camInfo, callback ) {
        const headers = { 'Authorization': 'Token ' + userToken };
        this.client( { url: CAM_URL, form: camInfo, headers: headers, method: 'POST' }, ( err, appRes, _data ) => {
            if ( err ) { console.error( err ); return callback ( error, appRes.statusCode ); }
            if ( appRes.statusCode != 201 ) return callback( appRes.statusCode );
            let data = JSON.parse( _data );
            return callback( null, data, appRes.statusCode );
        });

    }

    _requestCamUpdate( userToken, camInfo, callback ) {
        const headers = { 'Authorization': 'Token ' + userToken };
        console.log( CAM_URL + camInfo[ ID_KEY ] + "/" )
        console.log( camInfo )
        console.log ( headers )
        this.client( { 
            url: CAM_URL + camInfo[ ID_KEY ] + "/", 
            form: camInfo, 
            headers: headers, 
            method: 'PUT' }, ( err, appRes, _data ) => {
            console.log( appRes.statusCode )
            if ( err ) return callback ( err );
            if ( appRes.statusCode != 200 ) return callback( appRes.statusCode );
            //let data = JSON.parse( _data );
            return callback( null, _data, appRes.statusCode );
        });
    }

    _requestLogout( callback ) {
        this.store.set( HAS_LOGGED_IN_KEY, false );
        this.store.delete( USER_KEY );
        this.store.delete( CAM_KEY );   
        return callback( null );
    }

    _requestLogIn( userCreds, callback ) {
        this.client( { url: AUTH_URL, form: userCreds, method: 'POST' }, ( err, appRes, _user ) => {
            if ( err || !appRes || !appRes.statusCode == 200 ) return callback ( err );
            let user = JSON.parse( _user );
            return callback( null, user, appRes.statusCode );
        });
    }

    _checkAuthInfo( callback ) {
        this.store.get( HAS_LOGGED_IN_KEY, ( err, hasLoggedIn ) => {
            
            if ( err ) return callback ( err );
            if ( !hasLoggedIn ) return callback( null, hasLoggedIn );
            this.store.get( USER_KEY, ( err, user ) => {
                if ( err ) return callback ( err );
                console.log( hasLoggedIn )
                console.log( user.token )
                return callback ( null, hasLoggedIn, user );
            });
        });
    }


    _sendError ( res, err, statusCode = 500 ) {
        console.error( err );
        this._send( res, err, statusCode );
    }

    _send( res, message, statusCode = 200 ){
        res.status( statusCode );
        res.json( message );
    }


}

module.exports = AppHandler;