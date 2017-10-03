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

const fs = require('fs');
const config = require('config')
const express = require('express')
const WebSocket = require('ws')
const request = require('request')
const SignalingHandler = require(LIB + 'SignalingHandler')
const d = require(LIB + 'definitions')
const logger = require(LIB + 'logger')
const jsonfile = require('jsonfile')
const OAuthService = require(LIB + 'OAuthService')
const auth = new OAuthService(request)

const APP_URL = config.server.rest_url
const CAM_REFRESH_URL = APP_URL + config.cam_api.refresh_creds
const CAM_SERVICES_URL = APP_URL + config.cam_api.services
const CAM_VERIFY_URL = APP_URL + config.cam_api.verify_creds
const SIG_URL = config.server.signaling_url
const MAX_TIMEOUT = config.server.reconnect_max_timeout

const credsFile = 'config/credentials.json'
var creds = null
if (fs.existsSync(credsFile)) { 
    creds = jsonfile.readFileSync(credsFile)
} else {
    return logger.error('No "config/credentials.json" provided.')
}

//
// Web socket client
//

var attemptCount = 0

function attemptWebsocketConn(cam, creds) { 
    
    attemptCount++
    
    var timeout = 1000 * Math.pow(attemptCount, 2)
    timeout = (timeout > MAX_TIMEOUT) ? MAX_TIMEOUT : timeout
    
    logger.info('Reconnecting after ' + Math.round(timeout / 1000) + 'sec.') 
    
    setTimeout(() => { connectWebsocket(cam, creds) }, timeout)
}


function connectWebsocket(cam, creds) {    
    
    logger.debug('Connecting @' + SIG_URL +'. Ready, steady ...')
    
    const ws = new WebSocket(SIG_URL, {
        perMessageDeflate: false,
        headers: { 'Authorization': 'Bearer ' + creds.access_token }
    })
   
    const args = {
        ws: ws, 
        cam: cam,
        creds: creds
    }

    const handler = new SignalingHandler(args)

    ws.on('open', () => {
        logger.debug('... go!')
        attemptCount = 0
        handler.onSessionOpen(SIG_URL)
    })

    ws.on('error', (err) => {
        handler.onSessionError(err)
        attemptWebsocketConn(cam, creds)
    })

    ws.on('close', () => {
        handler.onSessionClose(SIG_URL)
        attemptWebsocketConn(cam, creds)
    })

    ws.on('message', (_msg, flags) => {
        
        try {
            logger.info('MSG', _msg)
            var msg = JSON.parse(_msg)
            var payload = msg.payload
            logger.info('==> Msg ID: "' + payload.id + '"')
        } catch (e) {
            return this.sendError(e)
        }

        switch (payload.id) {
            
            case d.START:
                handler.onStart(payload)
                break
            case d.STOP:
                handler.onStop(payload)
                break
            case d.ANSWER:
                handler.onAnswer(payload)
                break
            case d.RELOAD:
                handler.onReload(payload)
                break
            case d.CONFIG:
                handler.reconfigure()
                break
            case d.ERROR:
                handler.onError(payload)
                break
            default: 
                logger.warn('Unrecognized message.')
                break 
        }
    })
}


var initCount = 0

function initAgain() {
    
    initCount++
    
    var timeout = 1000 * Math.pow(initCount, 4)
    timeout = (timeout > MAX_TIMEOUT) ? MAX_TIMEOUT : timeout
    
    if (initCount > 10) return logger.error('Max reconnect tries. Verification impossible. Please check the config fiels.')
    logger.info('Init again after ' + Math.round(timeout / 1000) + 'sec.') 
    
    setTimeout(init, timeout)
}


function init() {

    var refreshed = false 

    logger.info('Initing ... ')
    logger.info('Verifying @' + CAM_VERIFY_URL)
    
    auth.verifyToken(CAM_VERIFY_URL, creds, onVerify)

    function onVerify(err, res, data) {
        
        if (err) {
            logger.info('On verify error:', err)
            return initAgain()
        }

        if ((res.statusCode === 403 || res.statusCode === 401) && !refreshed) {
 
            return auth.refreshToken(CAM_REFRESH_URL, creds, onRefresh)
        } 

        
        const camDetailUrl = CAM_SERVICES_URL + data.cam_uuid + '/'
        
        auth.get(camDetailUrl, creds, (err, res, cam) => {
            logger.info(cam)
            if (err) return logger.error(err)

            attemptWebsocketConn(cam, creds)
        })
        
    }


    function onRefresh(err, res, data) {

        if (err) return logger.error('On Refresh', err)

        creds.access_token= data.access_token
        creds.refresh_token = data.refresh_token
        jsonfile.writeFileSync(credsFile, creds, { spaces: 2 })

        refreshed = true

        auth.verifyToken(CAM_VERIFY_URL, creds, onVerify)
    }
    
}


init()



                
