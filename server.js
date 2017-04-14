/**
 * Camera Nodejs server application.
 * 
 * By Georgy St. Georgiev, 2017.
 */

'use strict';

// Libs.
const LIB_PATH = './lib';
const os = require('os');
const path = require('path');
const url = require('url');
const express = require('express');
const bodyParser = require('body-parser');
const WS = require('ws');
const http = require('http');
const config = require('config');
const request = require('request');
const getmac = require('getmac');

const MediaClient = require(LIB_PATH + '/media/KurentoClient');

const InMemoryStore = require(LIB_PATH + '/db/InMemoryDB');
const DiskStore = require(LIB_PATH + '/store/DiskStore');

const CameraHandler = require(LIB_PATH + '/handler/CameraHandler');
const AppHandler = require(LIB_PATH + '/handler/AppHandler');

// Constants

const SDP_OFFER_KEY = 'sdp_offer';
const SDP_ANSWER_KEY = 'sdp_answer';
const START_STREAM_KEY = 'start_stream';
const STOP_STREAM_KEY = 'stop_stream';
const STREAM_ID_KEY = 'stream_token';
const START_SESSION_KEY = 'start_session';
const SESSION_ID_KEY = 'session_id';
const CLOSE_KEY = 'close';
const ERROR_KEY = 'error';
const MESSAGE_KEY = 'message';
const OPEN_KEY = 'open';

const CAM_SESSION_KEY = 'cam_session';
const CAM_MODE_KEY = 'cam_mode';
const CAM_STATE_KEY = 'cam_state';

const CAM_ID_KEY = 'cam_token';
const USER_ID_KEY = 'user_token';
const HAS_LOGGED_IN_KEY = 'has_logged_in';
const HARDWARE_ID_KEY = 'hardware_id';

const ENV = process.env.NODE_ENV;

const APP_URL = config.APP_API.BASE;
const AUTH_URL = APP_URL + config.APP_API.AUTH;
const CAM_URL = APP_URL + config.APP_API.CAMS;

const SIGNALING_URL = config.SIGNALING_API.BASE;
const MAX_TIMEOUT = config.RECONNECT_MAX_TIMEOUT;

// Instances
const diskStore = new DiskStore(config.LOCAL_STORAGE_DIR + "/" + ENV);
const localUrlParsed = url.parse(config.LOCAL_API.BASE);
const PORT = localUrlParsed.port;

if (ENV === 'dev') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Ignore warning for self-signed certificates
}

/**
 * Http server
 */
var app = express();
var app_handler = new AppHandler(diskStore, request);
app.use(express.static(path.join(__dirname, 'static')));                                  
app.use(bodyParser.urlencoded({extended : true}));               
app.use(bodyParser.text());                                    
app.use(bodyParser.json({type : 'application/json'}));  


// User auth routes
app.route(config.LOCAL_API.AUTH)
.get(function(req, res) {
    app_handler.hasLoggedIn(req, res);
})
.delete(function(req, res) { 
    app_handler.logOut(req, res);
})
.post(function(req, res) { 
    app_handler.logIn(req, res, connectToServer);
});

// Cam routes
app.route(config.LOCAL_API.CAMS)
.get(function(req, res) {
    app_handler.getCam(req, res);
})
.post(function(req, res) { 
    app_handler.postCam(req, res);
});

// Run the server.
app.listen(PORT, function(err) {
    getmac.getMac(function(err, mac_address) { 
        
        console.log('==> Server started at ' + config.LOCAL_API.BASE)
        diskStore.set(HARDWARE_ID_KEY, mac_address);
        
        diskStore.get(HAS_LOGGED_IN_KEY, (err, hasLoggedIn) => {
            //console.log('Login status: ', hasLoggedIn)
            if (hasLoggedIn) { connectToServer(); }
        });
    });
});

/**
* Web socket client
*/

var counter = 0;

function connectToServer() { 
    counter++;
    var timeout = 1000 * Math.pow(counter, 2);
    timeout = (timeout > MAX_TIMEOUT) ? MAX_TIMEOUT : timeout;
    console.log('Reconnecting after ' + Math.round(timeout / 1000) + 'sec.') 
    setTimeout(connectWebSocket, timeout);
}

function connectWebSocket(callback) {    
    var ws = new WS(SIGNALING_URL, {
        perMessageDeflate: false
    });
    const mediaClient = new MediaClient();
    const cam_handler = new CameraHandler(ws, mediaClient, diskStore);

    ws.on(OPEN_KEY, (evt) => {
        counter = 0;
        cam_handler.onSessionOpen(evt);
    });

    ws.on(ERROR_KEY, (evt) => {
        cam_handler.onSessionError(evt);
        return connectToServer();
    });

    ws.on(CLOSE_KEY, (evt) => {
        cam_handler.onSessionClose(evt);
        return connectToServer();
    });

    ws.on(MESSAGE_KEY, (_msg, flags) => {
        var msg = JSON.parse(_msg);
        console.log('==> Cam message ID "' + msg.id + '".');
        switch (msg.id) {
        case CAM_SESSION_KEY:
            cam_handler.onSessionReady(msg);
            break;
        case CAM_MODE_KEY:
            cam_handler.onModeUpdate(msg);
            break;
        case SDP_OFFER_KEY:
            cam_handler.onOffer(msg);
            break;
        case SDP_ANSWER_KEY:
            cam_handler.onAnswer(msg);
            break;
        case START_STREAM_KEY:
            cam_handler.onStartCam(msg);
            break;
        case STOP_STREAM_KEY:
            cam_handler.onStopCam(msg);
            break;
        case ERROR_KEY:
            cam_handler.onError(msg);
            break
        default:
            break;    
        }
    });
}
