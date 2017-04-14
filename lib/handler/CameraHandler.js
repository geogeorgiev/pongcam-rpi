/**
 * Baiivan.
 * By Georgy St. Georgiev, 2017.
 * CameraHandler.js
 */

'use strict';

// Constants
const LIB_PATH = '../../lib';
const ENV = process.env.NODE_ENV

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
const CAM_TYPE = 'cam_type';
const CAM_TYPE_RTP = 'RTP';

class CameraHandler {

    constructor (ws, client, store) {
        this.ws = ws;
        this.mediaClient = client;
        this.store = store;
        this.session = {};
        this.session.state = CAM_STATE_OFF;
    }

    //
    // Session handlers
    //

    onSessionOpen(msg) {
        var $this = this;
        this.store.get(CAM_KEY, onGet);
        function onGet(err, cam) {
            if (err || !cam[TOKEN_KEY]) return $this._sendError(err, 500);
            $this.session.camToken = cam[TOKEN_KEY];
            $this.session.mode = cam.mode;
            $this.session.state = CAM_STATE_READY;

            console.log('==> Cam mode: ' + cam.mode);
            var res = {id: CAM_SESSION_KEY};
            res[STREAM_ID_KEY] = cam.token;
            res[CAM_STATE_KEY] = $this.session.state;
            return $this._send(res);
        }
    }

    /**
    * Triggered when camera has signed up with the signaling server.
    */
    onSessionReady(msg) {
        var $this = this; 
        var res = {id : CAM_MODE_KEY};
        res[STREAM_ID_KEY] = $this.session.camToken;
        res[CAM_MODE_KEY] = $this.session.mode;
        return $this._send(res); 
    }

    onSessionClose(evt) {
        console.log('==> Closing session ' + this.session.sessionId);
        var $this = this;
        this.mediaClient.stopStream(this.session, (err) => {
            if (err) console.error(err);
            $this.session.state = CAM_STATE_OFF;
        });
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

    /**
    * Handle cam mode update.
    */
    onModeUpdate(msg) {
        var $this = this;
        var camMode = msg[CAM_MODE_KEY];
        
        // return if the same
        if (this.session.mode === camMode) return;

        // store new mode in session and on disk
        this.session.mode = camMode;

        console.log(this.session.mode);

        this.store.get(CAM_KEY, onGet);
        function onGet(err, cam) {
            if(err) return console.error(err);
            cam.mode = camMode;
            $this.store.set(CAM_KEY, cam);

            var res = {id: CAM_MODE_KEY}
            res[CAM_MODE_KEY] = camMode;
            res[STREAM_ID_KEY] = $this.session.camToken;
            $this._send(res);
        }
    }

    /**
    * Handle request for an sdp offer.
    */
    onOffer(msg) {
        var $this = this;
        // Generate and send an offer to server.
        this.mediaClient.generateOffer((err, offer) => {
            if (err) return $this._sendError(err, 500);  
            
            var res = {id : CAM_SDP_OFFER_KEY};
            res[STREAM_ID_KEY] = $this.session.camToken;
            res[SDP_OFFER_KEY] = offer;
            res[CAM_TYPE] = CAM_TYPE_RTP;
            $this._send(res);
        });
    }

    /**
    * Handle sdp answer receival.
    */
    onAnswer(msg) {
        var $this = this;
        var answer = msg[SDP_ANSWER_KEY];
        if (!answer) return this._sendError('No SDP answer sent.', 400);
        
        this.mediaClient.processAnswer(answer, onProcessAnswer);
        function onProcessAnswer(err, connCreds) {
            if (err) return $this._sendError(err, 500);
            $this.session.host = connCreds[HOST_KEY];
            $this.session.port = connCreds[PORT_KEY];
           
            var res = {id : CAM_SDP_ANSWER_KEY};
            res[STREAM_ID_KEY] = $this.session.camToken;
            //res[CAM_STATE_KEY] = $this.session.state;
            return $this._send(res);
             
        }
    }

    /**
    * Handle request for turning ON the cam.
    */
    onStartCam(msg) {
        var $this = this;
        console.log('\n==> Start stream request.')
        // If cam in passive mode, start sdp negotiation and return
        //if (this.session.mode == CAM_MODE_PASSIVE) {
            /*this.mediaClient.generateOffer((err, offer) => {
                if (err) return $this._sendError(err, 500);  
                var res = {id : CAM_SDP_OFFER_KEY};
                res[STREAM_ID_KEY] = $this.session.camToken;
                res[SDP_OFFER_KEY] = offer;
                res[CAM_TYPE] = CAM_TYPE_RTP;
                return $this._send(res);
            });*/

            // If in active mode cam should be on, so return cam state update.
            this._turnOn((err) => {
                if (err) return $this._sendError(err, 500); 
                var res = {id : CAM_STATE_KEY};
                res[STREAM_ID_KEY] = $this.session.camToken;
                res[CAM_STATE_KEY] = $this.session.state;
                return $this._send(res);
            });  
          
    }

    /**
    * Handle request for turning OFF the cam.
    */
    onStopCam(msg) {
        var $this = this;
        console.log('Cam mode ' + this.session.mode)
        
        // If in active mode, return - stopping is not allowed.
        if (this.session.mode == CAM_MODE_ACTIVE) return;
         
        this._turnOff((err) => {
            if (err) return $this._sendError(err, 500); 
            var res = {id : CAM_STATE_KEY};
            res[STREAM_ID_KEY] = $this.session.camToken;
            res[CAM_STATE_KEY] = $this.session.state;
            $this._send(res);
        });
    }

    _turnOn(callback){
        var $this = this;
        console.log('==> Start with state ', this.session.state);
        
        // if cam is ON, return - it's on already.
        if (this.session.state == CAM_STATE_ON) return callback(null);

        this.mediaClient.startStream(this.session, onStart)
        function onStart(err) {
            if (err) return callback();
            $this.session.state = CAM_STATE_ON; 
            return callback(null);
        }
    }

    _turnOff(callback){
        var $this = this;
        console.log('==> Stop with state ', this.session.state);
        
        // if cam is NOT ON, return - it's not streaming anyways. 
        if (this.session.state < CAM_STATE_ON) return;
        

        this.mediaClient.stopStream(this.session, onStop);
        function onStop(err) {
            if (err) callback(err);  
            $this.session.state = CAM_STATE_READY;
            return callback(null);
        }
    }

    _sendError(err, code) {
        console.error(err);
        this._send({id: 'error', error: err, code: code});
    }

    _send(msg, _conn){
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