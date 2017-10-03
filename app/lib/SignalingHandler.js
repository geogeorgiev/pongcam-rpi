/**
 * Baiivan.
 * By Georgy St. Georgiev, 2017.
 * SignalingHandler.js
 */

'use strict'

const ENV = process.env.NODE_ENV
const LIB = './'
const ROOT = '../'
const d = require(LIB + 'definitions')
const config = require('config')
const logger = require(LIB + 'logger')
const GstManager = require(LIB + 'GstManager')
const OAuthService = require(LIB + 'OAuthService')
const request = require('request')
const jsonfile = require('jsonfile')
const credsFile = 'config/credentials.json'
const auth = new OAuthService(request)
const APP_URL = config.server.rest_url
const CAM_SERVICES_URL = APP_URL + config.cam_api.services
const CAM_REFRESH_URL = APP_URL + config.cam_api.refresh_creds



class SignalingHandler {

    constructor(args) {

        this.ws = args.ws
        this.creds = args.creds
        this.mediaManager = new GstManager()
        this.config = {}
        this.cam = null
        this.camID = null

        this.setCam(args.cam)
    }

    onStart(msg) {
       
        logger.info('Status', this.config)
       
        if (this.config.status == 1) {
            this.send({ id: d.OFFER })
        }

        //this.publishEvent('some event', 'some content')
    }

    onAnswer(msg) { 

        if (!msg.answer) return this.sendError('No answer sent.', 400)
        
        this.mediaManager.startMJPEGSender(msg.answer, (err) => {
            
            if (err) return this.sendError(err)

            this.hasStarted = true

            this.send({ 
                id: d.START, 
                port: msg.answer.port 
            })
        })
 
    }

    onStop(msg) {

        this.mediaManager.stopMJPEGSender((err) => {
            
            if (err) return this.sendError(err)
        
            this.hasStarted = false
        

            this.send({ id: d.STOP })
        })
    }

    onReload(msg) {

        if (!msg.settings) return this.sendError('No settings sent.', 400)

        const newSetting = msg.settings
    }

    publishEvent(event_id, payload) {

        this.send({
            id: d.CAM_EVENT,
            event_id: eventID,
            payload: payload
        })
    }

    setCam(cam) {
        this.cam = cam
        this.camID = cam.uuid
        this.config = JSON.parse(this.cam.profile.config)
    }

    refresh(callback) {

        auth.refreshToken(CAM_REFRESH_URL, this.creds, (err, res, data) => {
            
            if (err) return callback(err)
            if (res.statusCode !== 200) return callback(res.statusCode)

            this.creds.access_token= data.access_token
            this.creds.refresh_token = data.refresh_token
            
            jsonfile.writeFileSync(credsFile, this.creds, { spaces: 2 })

            callback(null)
        })
    }

    reconfigure() {

        const camDetailUrl = CAM_SERVICES_URL + this.camID + '/'

        auth.get(camDetailUrl, this.creds, (err, res, cam) => {
            if (err) return logger.error(err)

            if (res.statusCode === 403 || res.statusCode === 401) {
                return this.refresh((err) => {
                    if (err) return logger.error(err)
                    this.reconfigure()
                })
            }
            
            logger.info('Cam', cam)
            this.setCam(cam)

            if (this.config.status == 1 && !this.hasStarted) {
                this.send({ id: d.OFFER })
            } else if (this.config.status == 0 && this.hasStarted) {
                this.onStop()
            }

        })
    }
    
    onSessionOpen(url) {

        logger.debug('\nSession with ' + url + ' is OPENED.')
    }

    onSessionClose(url) {

        logger.debug('Session with ' + url + ' is CLOSED.\n')
    
        this.mediaManager.stopMJPEGSender((err) => {    
                
            if (err) logger.error(err)
        })
    }

    onSessionError(err) {
            
        logger.error(err)
        
        this.mediaManager.stopMJPEGSender((err) => {  

            if (err) logger.error(err)
        })
    }
    
    onError(err) {

        logger.error(err)
    }

    sendError(err, _code) {
        
        logger.error(err)
        const code = _code || 400
        this.send({ 
            id: d.ERROR,
            error: err, 
            code: code 
        })
    }

    send(channel, payload){

        if (arguments.length === 1) {
            payload = channel
            channel = 'main'
        } 
        
        if (this.ws && this.ws.readyState == 1) {
            this.ws.send(JSON.stringify({
                'channel': channel,
                'payload': payload
            }))
            return 0
        } else {
            return 1
        }
    }
}


module.exports = SignalingHandler
