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
const utils = require( './lib/utils.js' );
const child = require( 'child_process' );
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

const signalingServerUrl = config.SIGNALING_API.base;

const PONG_KEY = 'pong'
const SDP_OFFER_KEY = 'sdp_offer';
const SDP_ANSWER_KEY = 'sdp_answer';
const START_STREAM_KEY = 'start_stream';
const STOP_STREAM_KEY = 'stop_stream';
const ICE_CANDIATE_KEY = 'ice_candidate';
const STREAM_ID_KEY = 'stream_id';
const SESSION_ID_KEY = 'session_id';

let gst = null;

var wss = null;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

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
            response.status( response.statusCode ).send( 'Server is not happy :|' );
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


function parseOffer(sdp){
    let arr = sdp.split('\r\n');
    
    let host = arr[3].split(" ")[2];
    let port = arr[5].split(" ")[1];
    
    return {
            host: host,
            port: port
        };
}

const videoOnlyH264CamSrc = "VideoOnlyH264CamSrc";
const videoOnlyVP8CamSrc = "VideoOnlyVP8CamSrc"
const videoOnlyH264TestSrc = "VideoOnlyH264TestSrc";

function spawnGstreamer( opts ) {
    //console.log( opts )
    let cmd = '/usr/local/bin/gst-launch-1.0';
    let src = null;
    let encoding = null;
    let args = null;
    let videoconvert = [ '!', 'queue', '!', 'videorate',
        '!', 'videoconvert', '!', 'videoscale', '!', 
        'video/x-raw,width=640,height=480,framerate=30/1' ]

    let sink = [ '!', 'udpsink', 'host=' + opts.host, 'port=' + opts.port ]; 

    switch ( opts.videoStreamType ) {
    case ( videoOnlyVP8CamSrc ):
        src =  [ 'v4l2src', 'device=/dev/video0' ];
        encoding = [ '!', 'vp8enc', '!', 'rtpvp8pay', 'pt=97' ];
        break;
    case ( videoOnlyH264CamSrc ):
        src =  [ 'v4l2src', 'device=/dev/video0' ];
        encoding = [ '!', 'x264enc', 'tune=zerolatency', '!', 'rtph264pay', 'pt=96' ];
        break;
    case ( videoOnlyH264TestSrc ):
        src =  [ 'videotestsrc', 'pattern=0' ];
        encoding = [ '!', 'x264enc', 'tune=zerolatency', '!', 'rtph264pay', 'pt=96' ];
        break;
    default:
        src =  [ 'videotestsrc', 'pattern=0' ];
        encoding = [ '!', 'x264enc', 'tune=zerolatency', '!', 'rtph264pay', 'pt=96' ];
        break;
    }

    args = src.concat( videoconvert ).concat( encoding ).concat( sink );
    console.log( '==> GST' );
    console.log( args );
    gst = child.spawn( cmd, args );
    
    gst.stderr.on( 'data', (err) => {
        if ( gst ) {
            gst.kill( 'SIGINT' );
        }
    });
    
    gst.on( 'exit', () => {

    });
    
    gst.stdout.on('data', (data) => {
        //console.log(data.toString())
    })
    return gst;
}
//
function startStream( sdpAnswer, videoStreamType ) {
    let opts = parseOffer( sdpAnswer );
    opts.videoStreamType = videoStreamType;
    let gst = spawnGstreamer( opts );
}

function stopStream() {
    if ( gst ) {
        gst.kill( 'SIGINT' );
    }
}

function onSpawnError( data ) {
    console.log( data.toString() );
    if ( gst ) {
        gst.kill( 'SIGINT' );
    }
}
 
function onSpawnExit( code ) {
  if ( code != null ) {
    console.log( 'GStreamer error, exit code ' + code );
    
  }
}

function sendOffer( wss ) {
    wss.send( JSON.stringify( {
        id: 'sdp_offer',
        stream_id: store.getItem( camTokenKey ) + ':' + '0' + ':' + 'src' + ':' + 'RtpEndpoint',
        sdp_offer: 
            "v=0\r\n" + 
            "o=- 0 0 IN IP4 0.0.0.0\r\n" + 
            "s=Cam\r\n" + 
            "c=IN IP4 0.0.0.0\r\n" + 
            "t=0 0\r\n" + 
            "m=video 5200 RTP/AVP 96 97\r\n" + 
            "a=sendonly\r\n" + 
            "a=rtpmap:96 H264/90000\r\n" +
            "a=rtpmap:97 VP8/90000"
    } ), ( err ) => {
        if ( err ) {
            //console.log( err ); 
        }
        console.log( '==> SDP offer sent.' );
    } );
}

let timeout = null;
let timeoutInterval = 2000;
let reconnectInterval = 1000;
let maxReconnectInterval = 30000;
let reconnectDecay = 1.5;
let reconnectAttempts = 0;

function reconnect(){
    clearTimeout(timeout);
    let timeoutPeriod = reconnectInterval * Math.pow( reconnectDecay, reconnectAttempts );
    let timeoutPeriodFiltered = timeoutPeriod  > maxReconnectInterval ? maxReconnectInterval : timeoutPeriod;
    console.log( timeoutPeriodFiltered )
    timeout = setTimeout(function() {
        reconnectAttempts++;
        connectToSignalingServer();
    }, timeoutPeriodFiltered );
}


// Try to connect to signaling server.
function connectToSignalingServer() {
    if ( checkAuth( store ) ) {
        console.log( "Authed and ready to stream." );

        wss = new ws( signalingServerUrl, {
            perMessageDeflate: false
        });

        wss.on( 'open', () => {
            console.log( 'Connection opened to ' + signalingServerUrl );
            clearTimeout( timeout );
            reconnectAttempts = 0;
            
            setTimeout(() => {
                sendOffer( wss );
            }, 500);
        });

        wss.on( 'error', ( evt ) => {
            if ( wss.readyState != 1) {
                console.log( 'WS needs to reconnect: ' + evt);
                stopStream();
                reconnect();
            }
        });

        wss.on( 'close', ( evt ) => {
            
            if ( evt.code == 3001 ) {
                console.log( 'WS is closed' );
                wss = null;
            } else {
                wss = null;
                console.log(' ws connection error' );
            }
            stopStream();
            reconnect();
        });

        wss.on( 'message', ( _message, flags ) => {
            var message = JSON.parse( _message );
            
            console.log( '==> Message ID: "' + message.id + '".' );
            
            switch ( message.id ) {
            //case 'offerRequest':
            //    sendOffer( wss );
            //    break;
            
            case SDP_OFFER_KEY:
                console.log(message)
                startStream( message[SDP_OFFER_KEY], message.video_type );
                break;

            case STOP_STREAM_KEY:
                stopStream();
                break;
            case PONG_KEY:
                if ( message[SESSION_ID_KEY] ) {
                    console.log( '==> Web socket started with session ID is "' + message[SESSION_ID_KEY] + '".' );
                  }
                break;
            case 'error':
                console.log( '==> Error:', message.error );
                break
            default:
                //console.log( 'Nothing returned from Signalling server' );
                break;    
            }
        });

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
    try {
        connectToSignalingServer();    
    } catch ( error ) {
        console.log('==? Error')
        console.log(error)
    }
    
} );

module.exports = { 
    app: app,
    store: store,
    httpClient: request,
    checkAuth: checkAuth
}; // for testing
