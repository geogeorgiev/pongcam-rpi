/**
 * Baiivan.
 * By Georgy St. Georgiev, 2017.
 * CameraHandler.js
 */

'use strict';

const ENV = process.env.NODE_ENV

const LIB = '../../lib/'

const d = require(LIB + 'definitions')
const logger = require(LIB + 'logger')
const child = require('child_process')


class SignalingHandler {


    constructor(args) {

        this.ws = args.ws
        this.mediaClient = args.mediaClient
        this.store = args.store
        this.cam = args.cam
        this.camID = args.cam.uuid
        this.camState = d.CAM_STATE_OFF
        this.streamHost = null
        this.streamPort = null

        //const cmd = '/usr/bin/pkill';
        //var proc = child.spawn(cmd, ['-f', 'gst-launch'], { detached: false })            
    }


    startStream(msg) {
        
        this.onStreamStart(msg)
    }


    onStreamStart(msg) {

        this.mediaClient.generateOffer((err, offer) => {
            
            if (err) return this.sendError(err)  
            
            const res = { id: d.SDP_OFFER }
            res[d.SDP_OFFER] = offer
            res[d.STREAM_TYPE] = d.STREAM_TYPE_RTP
            this.send(res)
        })
    }


    onSdpAnswer(msg) { 

        const $this = this
        const answer = msg[d.SDP_ANSWER]
        
        if (!answer) return this.sendError('No SDP answer sent.', 400)
        
        this.mediaClient.processAnswer(answer, (err, connCreds) => {
            
            if (err) return this.sendError(err)
            
            this.streamHost = connCreds['host']
            this.streamPort = connCreds['port']
            
            const res = { id: d.SDP_ANSWER }
            this.send(res)
            
            // If in active mode cam should be on, so return cam state update.
            this.turnOn(onTurnOn)
        })


        function onTurnOn(err) {
            
            if (err) return $this.sendError(err, 500)
            
            const res = { id: d.CAM_STATE }
            res[d.CAM_STATE] = $this.camState
            
            return $this.send(res)
        } 
    }


    onStreamStop(msg) {

        this.turnOff((err) => {
            
            if (err) return this.sendError(err)
            
            const res = { id: d.CAM_STATE }
            res[d.CAM_STATE] = this.camState
            
            return this.send(res)
        })
    }


    turnOn(callback) {

        logger.debug('==> Start with state ', this.camState)
        // if cam is ON, return - it's on already.
        if (this.camState == d.CAM_STATE_ON) return callback(null)

        this.mediaClient.startStream(this, (err) => {
            
            if (err) return callback(err)

            this.camState = d.CAM_STATE_ON
            
            return callback(null)
        })
    }


    turnOff(callback) {

         logger.debug('==> Stop with state ', this.camState)
        
        // if cam is NOT ON, return - it's not streaming anyways. 
        if (this.camState < d.CAM_STATE_ON) return
        
        this.mediaClient.stopStream(this, (err) => {

            if (err) return callback(err)

            this.camState = d.CAM_STATE_READY;

            callback(null)
        })
    }
    

    onSessionOpen(url) {

        logger.debug('Session is opened with signaling server @ ', url)
        
        setTimeout(() => {
            
            if (this.cam.profile.mode === 0) { 
                this.startStream(null)
            }

        }, 1000)
    }


    onSessionClose(evt) {

        logger.debug('==> Closing session ' + this.sessionId)
        
        this.mediaClient.stopStream(this, (err) => {
            
            if (err) logger.error(err)
            //logger.debug('==> Killing all gst-stream processes.')
            //const cmd = '/usr/bin/pkill';
            //var proc = child.spawn(cmd, ['-f', 'gst-launch'], { detached: false })
            this.camState = d.CAM_STATE_OFF
        })
    }


    onSessionError(evt) {

        logger.error(evt)
    }


    onMediaFlow(msg) {

        const mediaFlow = msg[d.MEDIA_FLOW]
        logger.debug('==> Media flow: ', mediaFlow)
    }


    onMediaState(msg) {

        const mediaState = msg[d.MEDIA_STATE]
        logger.debug('==> Media state: ', mediaState)
    }


    sendError(err, _code) {
        logger.error(err);
        var code = _code || 400;
        return this.send({id: 'error', error: err, code: code});
    }


    send(msg, _conn) {

        const conn = _conn || this.ws

        if (conn && conn.readyState == 1) {
            conn.send(JSON.stringify(msg))
            return 0
        } else {
            logger.debug('==> The message could not be sent. Connection is not available or ready.')
            return 1
        }
    }
}


module.exports = SignalingHandler
