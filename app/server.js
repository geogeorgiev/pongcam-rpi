/**
 * Camera Nodejs server application.
 * 
 * By Georgy St. Georgiev, 2017.
 */

'use strict';

const ENV = process.env.NODE_ENV;
if (ENV === 'dev') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Ignore warning for self-signed certificates
}

const LIB_PATH = './lib';
const os = require('os');
const path = require('path');
const url = require('url');
const express = require('express');
const bodyParser = require('body-parser');
const WS = require('ws');
const http = require('http');
const config = require('config');
const request = require('request')
const getmac = require('getmac');
const jsonfile = require('jsonfile')

const MediaClient = require(LIB_PATH + '/media/KurentoClient');
const DiskStore = require(LIB_PATH + '/store/DiskStore');
//const CameraHandler = require(LIB_PATH + '/handler/CameraHandler');
//const AppHandler = require(LIB_PATH + '/handler/AppHandler');

const d = require('./definitions')
const credsFile = './config/credentials.json'
const creds = jsonfile.readFileSync(credsFile)
const logger = require(LIB_PATH + '/logger');
const OAuthService = require(LIB_PATH + '/http/OAuthService');
const auth = new OAuthService(request)

const CamService = require(LIB_PATH + '/http/CamService');
const cam = new CamService(request)

const APP_URL = config.APP.URL;
const SIG_URL = config.SIGNALING.URL
const MAX_TIMEOUT = config.RECONNECT_MAX_TIMEOUT;


/**
* Web socket client
*/

var counter = 0;
/*
function attemptWebsocketConn(cam) { 
    
    counter++;
    var timeout = 1000 * Math.pow(counter, 2);
    timeout = (timeout > SIGNALING_RECON_MTO) ? SIGNALING_RECON_MTO : timeout;
    console.log('Reconnecting after ' + Math.round(timeout / 1000) + 'sec.') 
    setTimeout(() => {
        connectWebsocket(cam) }, timeout);
}

function connectWebsocket(cam) {    
    
    var ws = new WS(SIGNALING_URL, {
        perMessageDeflate: false,
        headers: { 'Authorization': 'Bearer ' + config.ACCESS_TOKEN }
    });

    const args = {
        ws: ws, 
        mediaClient: new MediaClient(), 
        diskStore: new DiskStore(config.STORAGE_DIR + "/" + ENV), 
        cam: cam
    }

    const camHandler = new CameraHandler(args);

    ws.on('open', (evt) => {
        counter = 0;
        camHandler.onSessionOpen(SIGNALING_URL);
    });

    ws.on('error', (err) => {
        camHandler.onSessionError(err);
        if(err.code === 'ECONNREFUSED') {
            attemptWebsocketConn(cam);
        }
        
    });

    ws.on('close', (evt) => {
        camHandler.onSessionClose(evt);
        return attemptWebsocketConn(cam);
    });

    ws.on('message', (_msg, flags) => {
        var msg = JSON.parse(_msg);
        console.log('==> Cam message ID "' + msg.id + '".');
        switch (msg.id) {
        case d.STREAM_START:
            camHandler.onStreamStart(msg);
            break;

        case d.SDP_ANSWER:
            camHandler.onSdpAnswer(msg);
            break;
        
        case d.STREAM_STOP:
            camHandler.onStreamStop(msg);
            break;
        
        case d.MEDIA_FLOW:
            camHandler.onMediaFlow(msg);
            break;
        
        case d.MEDIA_STATE:
            camHandler.onMediaState(msg);
            break;

        case d.ERROR:
            camHandler.onError(msg);
            break
            
        default:
            break;    
        }
    });
}
*/
/**
* Init process
*/

/*
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
        
        return attemptWebsocketConn(cam);
    }
}*/


var initCount = 0


function initAgain() {
    
    initCount++;
    
    var timeout = 1000 * Math.pow(initCount, 4);
    timeout = (timeout > MAX_TIMEOUT) ? MAX_TIMEOUT : timeout;
    
    if (initCount > 10) return logger.error('Max reconnect tries. Verification impossible. Please check the config fiels.')
    console.log('Init again after ' + Math.round(timeout / 1000) + 'sec.') 
    
    setTimeout(init, timeout)
}


function init() {

    logger.info('Initing')
    
    auth.verifyToken(APP_URL + 'cams/creds/', creds, onVerify)

    function onVerify(err, res, data) {

        if (err)  return logger.info(err)//initAgain()

        logger.info(res.statusCode)
        if (res.statusCode === 403 || res.statusCode === 401) {

            return auth.refreshToken(
                APP_URL + 'cams/creds/create/', 
                creds, 
                onRefresh
            )

        } else {
            //creds.CAM_ID = data.cam
            jsonfile.writeFileSync(credsFile, creds, {spaces: 2})
            logger.info('Ready for action :)', data)
            /*cam.list(APP_URL + 'cams/services/', creds, (err, res, body) => {
                if (err) logger.error(err)

                logger.info(body)

            })*/
        }
    }


    function onRefresh(err, res, data) {

        if (err) return logger.error(err)

        if (data) {
            logger.info(data)
            creds.ACCESS_TOKEN = data.access_token
            creds.REFRESH_TOKEN = data.refresh_token
            jsonfile.writeFileSync(credsFile, creds, {spaces: 2})
        } else {
            logger.warn('Empty data on refresh.')
        }

        logger.info('Ready for action')

   
    }
    
}


init();



                


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