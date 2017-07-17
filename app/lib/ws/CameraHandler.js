/**
 * Baiivan.
 * By Georgy St. Georgiev, 2017.
 * CameraHandler.js
 */

'use strict';

// Constants
const LIB_PATH = '../../lib';
const ENV = process.env.NODE_ENV



const CAM_START_STREAM_KEY = 'cam_start_stream';
const CAM_SDP_OFFER_KEY = 'cam_sdp_offer';
const CAM_SDP_ANSWER_KEY = 'cam_sdp_answer';
const CAM_SESSION_KEY = 'cam_session';

const CAM_STATE_KEY = 'cam_state';
const CAM_STATE_ON = 2;
const CAM_STATE_READY = 1;
const CAM_STATE_OFF = 0;
const CAM_MODE_KEY = 'cam_mode';
const CAM_MODE_ACTIVE = 1;
const CAM_MODE_PASSIVE = 0;
const SDP_OFFER_KEY = 'sdp_offer';
const SDP_ANSWER_KEY = 'sdp_answer';
const STREAM_ID_KEY = 'stream_token';
const SESSION_ID_KEY = 'session_id';
const PORT_KEY = 'port';
const HOST_KEY = 'host';
const CAM_KEY = 'cam';
const TOKEN_KEY = 'token';
const CAM_TYPE_KEY = 'cam_type';
const CAM_TYPE_RTP = 'RTP';

const MEDIA_STATE_KEY = 'media_state';
const MEDIA_FLOW_KEY = 'media_flow';

const child = require('child_process');
const logger = console;

class CameraHandler {

    constructor(args) {
        this.ws = args.ws;
        this.mediaClient = args.mediaClient;
        this.store = args.store;
        this.camToken = args.cam.token;
        this.camState = CAM_STATE_OFF;

        //const cmd = '/usr/bin/pkill';
        //var proc = child.spawn(cmd, ['-f', 'gst-launch'], { detached: false });
            
    }

    /**
    * Handle request for turning ON the cam.
    */
    onStreamStart(msg) {
        var $this = this;
        this.mediaClient.generateOffer(onOffer);
        function onOffer(err, offer) {
            if (err) return $this._sendError(err, 500);  
            var res = { id: CAM_SDP_OFFER_KEY };
            res[SDP_OFFER_KEY] = offer;
            res[CAM_TYPE_KEY] = CAM_TYPE_RTP;
            return  $this._send(res);
        }
    }

     /**
    * Handle sdp answer receival.
    */
    onSdpAnswer(msg) {
        var $this = this;
        var answer = msg[SDP_ANSWER_KEY];
        if (!answer) return this._sendError('No SDP answer sent.', 400);
        
        return this.mediaClient.processAnswer(answer, onProcessAnswer);
        
        function onProcessAnswer(err, connCreds) {
            if (err) return $this._sendError(err, 500);
            $this.streamHost = connCreds[HOST_KEY];
            $this.streamPort = connCreds[PORT_KEY];
            
            var res = { id: CAM_SDP_ANSWER_KEY };
            $this._send(res);
            
            // If in active mode cam should be on, so return cam state update.
            return $this._turnOn(onTurnOn);
        }

        function onTurnOn(err) {
            if (err) return $this._sendError(err, 500); 
            var res = { id: CAM_STATE_KEY };
            res[CAM_STATE_KEY] = $this.camState;
            return $this._send(res);
        } 
    }


    /**
    * Handle request for turning OFF the cam.
    */
    onStreamStop(msg) {
        var $this = this;
        // console.log('Cam mode ' + this.session.mode)
        // If in active mode, return - stopping is not allowed.
        // if (this.session.mode == CAM_MODE_ACTIVE) return;
         
        return this._turnOff(onTurnOff);
        function onTurnOff(err) {
            if (err) return $this._sendError(err, 500); 
            var res = { id: CAM_STATE_KEY };
            res[CAM_STATE_KEY] = $this.camState;
            return $this._send(res);
        }
    }

    _turnOn(callback) {
        var $this = this;
        console.log('==> Start with state ', this.camState);
        // if cam is ON, return - it's on already.
        if (this.camState == CAM_STATE_ON) return callback(null);

        console.log('Starting stream. Client.')
        return this.mediaClient.startStream(this, onStart)
        function onStart(err) {
            if (err) return callback(err);
            $this.camState = CAM_STATE_ON; 
            return callback(null);
        }
    }

    _turnOff(callback) {
        var $this = this;
        console.log('==> Stop with state ', this.camState);
        
        // if cam is NOT ON, return - it's not streaming anyways. 
        if (this.camState < CAM_STATE_ON) return;
        
        return this.mediaClient.stopStream(this, onStop);
        function onStop(err) {
            if (err) callback(err);  
            $this.camState = CAM_STATE_READY;
            return callback(null);
        }
    }
    
    onSessionOpen(url) {
        logger.log('Session is opened with signaling server @ ', url);
    }

    onSessionClose(evt) {
        console.log('==> Closing session ' + this.sessionId);
        var $this = this;
        return this.mediaClient.stopStream(this, onStopStream)
        function onStopStream(err) {
            if (err) console.error(err);
            //console.log('==> Killing all gst-stream processes.');
            //const cmd = '/usr/bin/pkill';
            //var proc = child.spawn(cmd, ['-f', 'gst-launch'], { detached: false });
            return $this.camState = CAM_STATE_OFF;
        }
    }

    onSessionError(evt) {
        console.error(evt);
    }

    //
    // Stream handlers
    //

    onError(err) {
        console.error(err);
    }

    onMediaFlow(msg) {
        var mediaFlow = msg[MEDIA_FLOW_KEY];
         console.log('==> Media flow: ', mediaFlow);
    }

    onMediaState(msg) {
        var mediaState = msg[MEDIA_STATE_KEY];
        console.log('==> Media state: ', mediaState);
    }

    _sendError(err, code) {
        console.error(err);
        return this._send({id: 'error', error: err, code: code});
    }

    _send(msg, _conn) {
        var conn = _conn || this.ws;
        if (conn && conn.readyState == 1) {
            conn.send(JSON.stringify(msg));
            return 0;
        } else {
            console.log('==> The message could not be sent. Connection is not available or ready.')
            return 1;
        }
    }
}

module.exports = CameraHandler;

    /*
    onSessionOpen(evt) {
        var $this = this;
        return this.store.get(CAM_KEY, onGet);
        function onGet(err, cam) {
            if (err || !cam[TOKEN_KEY]) return $this._sendError(err, 500);
            //$this.session.camToken = cam[TOKEN_KEY];
            //$this.session.mode = cam.mode;
            $this.session.state = CAM_STATE_READY;

            console.log('==> Cam mode: ' + cam.mode);
            var res = {id: CAM_SESSION_KEY};
            res[STREAM_ID_KEY] = cam.token;
            res[CAM_STATE_KEY] = $this.session.state;
            return $this._send(res);
        }
    }*/

    /**
    * Triggered when camera has signed up with the signaling server.
    */
    /*
    onSessionReady(msg) {
        var $this = this; 
        var res = {id : CAM_MODE_KEY};
        res[STREAM_ID_KEY] = $this.session.camToken;
        res[CAM_MODE_KEY] = $this.session.mode;
        return $this._send(res);
    }*/




    /**
    * Handle cam mode update.
    */
    /*onModeUpdate(msg) {
        var $this = this;
        var camMode = msg[CAM_MODE_KEY];
        
        // return if the same
        if (this.session.mode === camMode) return;

        // store new mode in session and on disk
        this.session.mode = camMode;

        console.log(this.session.mode);

        return this.store.get(CAM_KEY, onGet);
        function onGet(err, cam) {
            if(err) return console.error(err);
            cam.mode = camMode;
            $this.store.set(CAM_KEY, cam);

            var res = { id: CAM_MODE_KEY }
            res[CAM_MODE_KEY] = camMode;
            res[STREAM_ID_KEY] = $this.session.camToken;
            return $this._send(res);
        }
    }*/

    /**
    * Handle request for an sdp offer.
    */
    /*onOffer(msg) {
        var $this = this;
        // Generate and send an offer to server.
        return this.mediaClient.generateOffer(onOffer);

        function onOffer(err, offer) {
            if (err) return $this._sendError(err, 500);  
            
            var res = { id: CAM_SDP_OFFER_KEY };
            res[STREAM_ID_KEY] = $this.session.camToken;
            res[SDP_OFFER_KEY] = offer;
            res[CAM_TYPE] = CAM_TYPE_RTP;
            return  $this._send(res);
        }
    }*/
