/**
 * Baiivan.
 * By Georgy St. Georgiev, 2017.
 * SignalingHandler.js
 */

'use strict'

const ENV = process.env.NODE_ENV

const LIB = './'

const d = require(LIB + 'definitions')
const logger = require(LIB + 'logger')
const child = require('child_process')


class SignalingHandler {


    constructor(args) {

        this.ws = args.ws
        this.mediaClient = args.mediaClient
        this.cam = args.cam
        this.camID = args.cam.uuid
        this.camState = d.CAM_STATE.OFF
        this.streamHost = null
        this.streamPort = null     

    }


    startStream(msg) {

        this.onStreamStart(msg)
    }


    onStreamStart(msg) {

        const offer = this.mediaClient.generateOffer()
        const res = { id: d.SDP_OFFER }
        res[d.SDP_OFFER] = offer
        res[d.STREAM_TYPE] = d.STREAM_TYPE_RTP
        this.send(res)
    }


    onSdpAnswer(msg) { 

        const $this = this
        const answer = msg[d.SDP_ANSWER]
        
        if (!answer) return this.sendError('onSdpAnswer: No answer received.', 400)
        
        this.mediaClient.processAnswer(answer, (err, data) => {
            
            if (err) return this.sendError(err)
            
            this.streamDest = data
            
            const res = { id: d.SDP_ANSWER }
            this.send(res)
            
            this.turnOn(onTurnOn)
        })


        function onTurnOn(err) {
            
            if (err) return $this.sendError(err, 500)
            
            const res = { id: d.CAM_STATE_KEY }
            res[d.CAM_STATE_KEY] = $this.camState
            $this.send(res)
        } 
    }


    onStreamStop(msg) {

        this.turnOff((err) => {
            
            if (err) return this.sendError(err)
            
            const res = { id: d.CAM_STATE_KEY }
            res[d.CAM_STATE_KEY] = this.camState
            this.send(res)
        })
    }


    turnOn(callback) {
        
        // if cam is ON, return - it's on already.
        
        if (this.camState === d.CAM_STATE.ON) return callback(null)

        logger.info('Cam state', this.camState)
        logger.info('Turning camera on.')

        const opts = {}
        opts.host = this.streamDest.host
        opts.port = this.streamDest.port // config.APP_URL

        this.mediaClient.startStream(opts, (err, proc) => {
            
            if (err) return callback(err)
        logger.info('Starting stream with PID: ' + proc.pid)
            this.streamProc = proc
            this.camState = d.CAM_STATE.ON
          
        })
    }


    turnOff(callback) {
        
        // if cam is NOT ON, return - it's not streaming anyways. 
        const camMode = this.cam.profile.mode
        if (this.camState === d.CAM_STATE.OFF || camMode === d.CAM_MODE.ACTIVE) {
            return callback(null)
        }

        logger.info('Cam state', this.camState)
        logger.info('Turning camera off.')

        this.mediaClient.stopStream(this.streamProc, (err) => {

            if (err) return callback(err)

            this.camState = d.CAM_STATE.OFF

            callback(null)
        })
    }
    

    onSessionOpen(url) {

        logger.debug('Session is opened with signaling server @ ', url)
        
        setTimeout(() => {
            
            if (this.cam.profile.mode === 0) this.startStream(null)
        }, 1000)
    }


    onSessionClose(evt) {

        logger.info('Closing session ' + this.sessionId)
    
        this.mediaClient.stopStream(this.streamProc, (err) => {            
            if (err) logger.error(err)
        })
    }


    onSessionError(err) {
            
        logger.error(err)
        
        if (!this.proc) return //this.mediaClient.killAll() 

        this.mediaClient.stopStream(this.streamProc, (err) => {            
            if (err) logger.error(err)
        })
    
    
        
    }

    
    onError(err) {
        logger.error(err)
    }


    onMediaFlow(msg) {

        const mediaFlow = msg[d.MEDIA_FLOW]
        logger.debug('Media flow: ', mediaFlow)
    }


    onMediaState(msg) {

        const mediaState = msg[d.MEDIA_STATE]
        logger.debug('Media state: ', mediaState)
    }


    sendError(err, _code) {

        if (err) logger.error(err)

        const code = _code || 400
        this.send({id: 'error', error: err, code: code})
    }


    send(msg, _conn) {

        const conn = _conn || this.ws
        if (conn && conn.readyState == 1) {
            conn.send(JSON.stringify(msg))

            return 0
        } else {
            logger.debug('The message could not be sent. Connection is not available or ready.')
            
            return 1
        }
    }
}


module.exports = SignalingHandler
