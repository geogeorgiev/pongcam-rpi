/**
 * Camera Nodejs server application.
 * 
 * By Georgy St. Georgiev, 2017.
 */

'use strict'

const ENV = process.env.NODE_ENV

if (ENV === 'dev') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0" // Ignore warning for self-signed certificates
}

const LIB = './lib/'
const os = require('os')
const path = require('path')
const url = require('url')
const express = require('express')
const bodyParser = require('body-parser')
const WS = require('ws')
const http = require('http')
const config = require('config')
const request = require('request')
const getmac = require('getmac')
const jsonfile = require('jsonfile')

const MediaClient = require(LIB + 'media/KurentoClient')
const DiskStore = require(LIB + 'store/DiskStore')
const SignalingHandler = require(LIB + 'ws/SignalingHandler')
const d = require(LIB + 'definitions')
const credsFile = 'config/credentials.json'
const creds = jsonfile.readFileSync(credsFile)

const logger = require(LIB + '/logger')
const OAuthService = require(LIB + 'http/OAuthService')
const auth = new OAuthService(request)

const APP_URL = config.APP_URL
const SIG_URL = config.SIGNALING_URL
const MAX_TIMEOUT = config.RECONNECT_MAX_TIMEOUT


/**
* Web socket client
*/

var attemptCount = 0

function attemptWebsocketConn(cam) { 
    
    attemptCount++
    
    var timeout = 1000 * Math.pow(attemptCount, 2)
    timeout = (timeout > MAX_TIMEOUT) ? MAX_TIMEOUT : timeout
    
    console.log('Reconnecting after ' + Math.round(timeout / 1000) + 'sec.') 
    setTimeout(() => {connectWebsocket(cam) }, timeout)
}


function connectWebsocket(cam) {    
    
    var ws = new WS(SIG_URL, {
        perMessageDeflate: false,
        headers: { 'Authorization': 'Bearer ' + creds.ACCESS_TOKEN }
    })

    const args = {
        ws: ws, 
        mediaClient: new MediaClient(), 
        diskStore: new DiskStore(config.STORAGE_DIR + "/" + ENV), 
        cam: cam
    }

    const handler = new SignalingHandler(args)

    ws.on('open', (evt) => {

        attemptCount = 0

        handler.onSessionOpen(SIG_URL)
    })

    ws.on('error', (err) => {

        handler.onSessionError(err)
        
        if (err.code === 'ECONNREFUSED') {
            attemptWebsocketConn(cam)
        }
    })

    ws.on('close', (evt) => {

        handler.onSessionClose(evt)

        attemptWebsocketConn(cam)
    })

    ws.on('message', (_msg, flags) => {
        
        const msg = JSON.parse(_msg)
        logger.debug('==> Cam message ID "' + msg.id + '".')

        switch (msg.id) {
            
            case d.STREAM_START:
                handler.onStreamStart(msg)
                break

            case d.SDP_ANSWER:
                handler.onSdpAnswer(msg)
                break
            
            case d.STREAM_STOP:
                handler.onStreamStop(msg)
                break
        
            case d.MEDIA_FLOW:
                handler.onMediaFlow(msg)
                break
            
            case d.MEDIA_STATE:
                handler.onMediaState(msg)
                break

            case d.ERROR:
                handler.onError(msg)
                break
                
            default:
                break 
        }
    })
}


function onError(msg) {
    if (msg.status === 401) {
        
    }
}


var initCount = 0

function initAgain() {
    
    initCount++
    
    var timeout = 1000 * Math.pow(initCount, 4)
    timeout = (timeout > MAX_TIMEOUT) ? MAX_TIMEOUT : timeout
    
    if (initCount > 10) return logger.error('Max reconnect tries. Verification impossible. Please check the config fiels.')
    console.log('Init again after ' + Math.round(timeout / 1000) + 'sec.') 
    
    setTimeout(init, timeout)
}


function init() {

    var refreshed = false 

    logger.info('Initing')
    
    auth.verifyToken(APP_URL + 'cams/creds/verify/', creds, onVerify)

    function onVerify(err, res, data) {
        logger.info(res.statusCode)
        if (err) return logger.info('On verify', err)//initAgain()

        if ((res.statusCode === 403 || res.statusCode === 401) && !refreshed) {
            let url = APP_URL + 'cams/creds/refresh/'
            return auth.refreshToken(url, creds, onRefresh)
        } 

        jsonfile.writeFileSync(credsFile, creds, {spaces: 2})

        const CAM_DETAIL_URL = APP_URL + 'cams/services/' + data.cam + '/'
        
        auth.get(CAM_DETAIL_URL, creds, (err, res, cam) => {

            if (err) return  logger.error(err)

            return attemptWebsocketConn(cam)
        })
        
    }


    function onRefresh(err, res, data) {

        if (err) return logger.error('On Refresh', err)

        creds.ACCESS_TOKEN = data.access_token
        creds.REFRESH_TOKEN = data.refresh_token
        jsonfile.writeFileSync(credsFile, creds, {spaces: 2})

        refreshed = true

        return auth.verifyToken(APP_URL + 'cams/creds/verify/', creds, onVerify)

    }
    
}


init()



                


/**
 * Http server
 */

/*
var app = express()
var app_handler = new AppHandler(diskStore, request)
app.use(express.static(path.join(__dirname, 'static')))                                  
app.use(bodyParser.urlencoded({extended : true}))               
app.use(bodyParser.text())                                    
app.use(bodyParser.json({type : 'application/json'}))  



// User auth routes
app.route(config.LOCAL_API.AUTH)
.get(function(req, res) {
    app_handler.hasLoggedIn(req, res)
})
.delete(function(req, res) { 
    app_handler.logOut(req, res)
})
.post(function(req, res) { 
    app_handler.logIn(req, res, connectToServer)
})

// Cam routes
app.route(config.LOCAL_API.CAMS)
.get(function(req, res) {
    app_handler.getCam(req, res)
})
.post(function(req, res) { 
    app_handler.postCam(req, res)
})

// Run the server.
app.listen(PORT, function(err) {
    getmac.getMac(function(err, mac_address) { 
        
        console.log('==> Server started at ' + config.LOCAL_API.BASE)
        diskStore.set(HARDWARE_ID_KEY, mac_address)
        
        diskStore.get(HAS_LOGGED_IN_KEY, (err, hasLoggedIn) => {
            //console.log('Login status: ', hasLoggedIn)
            if (hasLoggedIn) { connectToServer() }
        })
    })
})
*/