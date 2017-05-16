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

const CAM_START_KEY = 'cam_start';
const CAM_STOP_KEY = 'cam_stop';

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

const MEDIA_STATE_KEY = 'media_state';
const MEDIA_FLOW_KEY = 'media_flow';
const CAM_SESSION_KEY = 'cam_session';
const CAM_MODE_KEY = 'cam_mode';
const CAM_STATE_KEY = 'cam_state';

const CAM_TOKEN_KEY = 'cam_token';
const USER_TOKEN_KEY = 'user_token';
const HAS_LOGGED_IN_KEY = 'has_logged_in';
const HARDWARE_ID_KEY = 'hardware_id';
const CAM_CODE_KEY = 'cam_code';
const CAM_KEY = "cam";

const ENV = process.env.NODE_ENV;

const APP_URL = config.APP_API.BASE;
const AUTH_URL = APP_URL + config.APP_API.AUTH;
const CAM_URL = APP_URL + config.APP_API.CAMS;

const SIGNALING_URL = config.SIGNALING_API.BASE// + '?apiKey=blahblah'
const MAX_TIMEOUT = config.RECONNECT_MAX_TIMEOUT;

// Instances
const diskStore = new DiskStore(config.LOCAL_STORAGE_DIR + "/" + ENV);
const localUrlParsed = url.parse(config.LOCAL_API.BASE);
const PORT = localUrlParsed.port;

if (ENV === 'dev') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Ignore warning for self-signed certificates
}

/**
* Web socket client
*/

var counter = 0;

function attempWebsocketConn(cam) { 
    
    counter++;
    var timeout = 1000 * Math.pow(counter, 2);
    timeout = (timeout > MAX_TIMEOUT) ? MAX_TIMEOUT : timeout;
    console.log('Reconnecting after ' + Math.round(timeout / 1000) + 'sec.') 
    setTimeout(() => {
        connectWebsocket(cam) }, timeout);
}

function connectWebsocket(cam) {    
    
    var ws = new WS(SIGNALING_URL, {
        perMessageDeflate: false,
        headers: { 'X-Auth-Token': cam.token }
    });

    const mediaClient = new MediaClient();
    const cam_handler = new CameraHandler(ws, mediaClient, diskStore, cam);

    ws.on(OPEN_KEY, (evt) => {
        counter = 0;
        cam_handler.onSessionOpen(evt);
    });

    ws.on(ERROR_KEY, (err) => {
        cam_handler.onSessionError(err);
        if(err.code === 'ECONNREFUSED') {
            attempWebsocketConn(cam);
        }
        
    });

    ws.on(CLOSE_KEY, (evt) => {
        cam_handler.onSessionClose(evt);
        return attempWebsocketConn(cam);
    });

    ws.on(MESSAGE_KEY, (_msg, flags) => {
        var msg = JSON.parse(_msg);
        console.log('==> Cam message ID "' + msg.id + '".');
        switch (msg.id) {
        
        case CAM_SESSION_KEY:
            cam_handler.onSessionReady(msg);
            break;
        
        case START_STREAM_KEY:
            cam_handler.onStreamStart(msg);
            break;
        
        case SDP_OFFER_KEY:
            cam_handler.onOffer(msg);
            break;
        
        case SDP_ANSWER_KEY:
            cam_handler.onAnswer(msg);
            break;
        
        case STOP_STREAM_KEY:
            cam_handler.onStreamStop(msg);
            break;

        case CAM_MODE_KEY:
            cam_handler.onModeUpdate(msg);
            break;

        case MEDIA_FLOW_KEY:
            cam_handler.onMediaFlow(msg);
            break;
        
        case MEDIA_STATE_KEY:
            cam_handler.onMediaState(msg);
            break;

        case ERROR_KEY:
            cam_handler.onError(msg);
            break
            
        default:
            break;    
        }
    });
}

/**
* Init process
*/
function auth(){
    var hardwareId = null;
    getmac.getMac(onAddress); 
    
    function onAddress(err, macId) {
        if (err) return console.error(err);
        hardwareId = macId;
        return diskStore.get(CAM_CODE_KEY, onDiskGet);
    }

    function onDiskGet(err, camCode) {
        if (err) return console.error(err);
        if (!camCode) return console.error('No activation code found.');
        console.log('Authing at ', CAM_URL);
        
        var form = {}
        form[HARDWARE_ID_KEY] = hardwareId;
        form[CAM_CODE_KEY] = camCode;
        request.post({ url: CAM_URL, form: form }, onRequest);
    }

    function onRequest (err, res, body) {
        if (err) console.error(err);
        console.log('statusCode:', res && res.statusCode);
        var data = JSON.parse(body);
        if (data[CAM_TOKEN_KEY] == undefined) return console.error('No token sent');
        if (data[CAM_MODE_KEY] == undefined) return console.error('No mode sent');

        var cam = { token: data[CAM_TOKEN_KEY], 
            mode: data[CAM_MODE_KEY] }
        
        diskStore.set(CAM_KEY, JSON.stringify(cam));
        
        //diskStore.set(CAM_MODE_KEY, data[CAM_MODE_KEY]);
        
        return attempWebsocketConn(cam);
    }
}

function initCam() {
    diskStore.get(CAM_KEY, onDiskGet);
    function onDiskGet(err, cam) {
        if (err) return console.error(err);
        if (!cam) return auth();
        cam = JSON.parse(cam) 
        if (!cam.token) return auth(); 

        return attempWebsocketConn(cam);
    }
}

initCam();


/**
 * Http server
 */

/*
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
*/