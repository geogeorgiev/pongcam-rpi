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
const GstManager = require(LIB + 'GstManager')

class SignalingHandler {


    constructor(args) {

        this.ws = args.ws
        this.cam = args.cam
        this.camID = this.cam.uuid
        
        this.mediaManager = new GstManager()
    }


    onStart(msg) {

        this.send({ id: 'offer' })
    }

   
    onAnswer(msg) { 

        if (!msg.answer) return this.sendError('No answer sent.', 400)
        
        const port = msg.answer.port
        const host = msg.answer.host
        
        this.mediaManager.startMJPEGSender({port: port, host: host}, (err) => {
            
            if (err) return this.sendError(err)

            this.send({ id: 'start' })
        })
 
    }


    onStop(msg) {

        this.mediaManager.stopMJPEGSender((err) => {
            
            if (err) return this.sendError(err)

            this.send({ id: 'stop' })
        })
    }


    onSettings(msg) {

        if (!msg.settings) return this.sendError('No settings sent.', 400)

        const newSetting = msg.settings
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
