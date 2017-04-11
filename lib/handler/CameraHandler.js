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
const CAM_REGISTER_KEY = 'cam_register';
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

    onSessionOpen(msg) {
        this.register(msg);
    }

    register(msg) {
        var $this = this;
        this.store.get(CAM_KEY, onGet);
        function onGet(err, cam) {
            if (err || !cam[TOKEN_KEY]) return $this._sendError(err, 500);
            $this.session.camToken = cam[TOKEN_KEY];
            $this.session.mode = cam.mode;
            var res = {id: CAM_REGISTER_KEY};
            res[CAM_TYPE] = CAM_TYPE_RTP;
            res[STREAM_ID_KEY] = cam.token;
            return $this._send(res);
        }
    }

    onRegister(msg) {
        var $this = this;
        this.session.state = CAM_STATE_READY;

        var res = {id : CAM_STATE_KEY};
        res[STREAM_ID_KEY] = this.session.camToken;
        res[CAM_STATE_KEY] = this.session.state;
        this._send(res);
        
        if (this.session.mode == CAM_MODE_ACTIVE) {
            return this._generateOffer();
        }
        
    }

    _checkCamMode(callback) {
        return callback(null, CAM_MODE_ACTIVE);
    }

    onModeChange(msg) {
        var $this = this;
        var camMode = msg[CAM_MODE_KEY];
        if (this.session.mode === camMode) return;
        this.session.mode = camMode;
        this.onStopStream(msg);
        
        if (this.session.state < CAM_STATE_ON && camMode == CAM_MODE_ACTIVE) {
            this._generateOffer();
        } 
        
        this.store.get(CAM_KEY, onGet);
        function onGet(err, cam) {
            if(err) return console.error(err);
            cam.mode = camMode;
            $this.store.set(CAM_KEY, cam);
        }
    }

    onOfferRequest(msg) {
        this._generateOffer();
    }

    _generateOffer(){
        var $this = this;
        this.store.get(CAM_KEY, onGet);

        function onGet(err, cam) {
            if (err || !cam[TOKEN_KEY]) return $this._sendError(err, 500);
            $this.mediaClient.generateOffer(onGenerateOffer);
        }

        function onGenerateOffer(err, sdpOffer) {
            if (err) return $this._sendError(err, 500);  
            var res = {id : CAM_SDP_OFFER_KEY};
            res[STREAM_ID_KEY] = $this.session.camToken;
            res[SDP_OFFER_KEY] = sdpOffer
            return $this._send(res);
        }
    }

    onAnswer(msg) {
        var $this = this;
        var answer = msg[SDP_ANSWER_KEY];
        if (!answer) return this._sendError('No SDP answer sent.', 400);
        
        this.mediaClient.processAnswer(answer, onProcessAnswer);
        function onProcessAnswer(err, connCreds) {
            if (err) return $this._sendError(err, 500);
            $this.session.host = connCreds[HOST_KEY];
            $this.session.port = connCreds[PORT_KEY];
            
            //if ($this.session.mode == CAM_MODE_ACTIVE) {
                $this._startCam((err) => {
                    if (err) return $this._sendError(err, 500); 
                    var res = {id : CAM_STATE_KEY};
                    res[STREAM_ID_KEY] = $this.session.camToken;
                    res[CAM_STATE_KEY] = $this.session.state;
                    return $this._send(res);
                });
            //}
        }
    }

    onStartStream(msg) {
        var $this = this;
        if (this.session.mode == CAM_MODE_PASSIVE) {
            return this._generateOffer();
        }

        $this._startCam((err) => {
            if (err) return $this._sendError(err, 500); 

            var res = {id : CAM_STATE_KEY};
            res[STREAM_ID_KEY] = $this.session.camToken;
            res[CAM_STATE_KEY] = $this.session.state;
            return $this._send(res);
        });    
    }

    onStopStream(msg) {
         var $this = this;
        console.log('Cam mode ' + this.session.mode)
        if (this.session.mode == CAM_MODE_ACTIVE) return;
        if (this.session.state < CAM_STATE_ON) return;
         
        this._stopCam((err) => {
            if (err) return $this._sendError(err, 500); 
            var res = {id : CAM_STATE_KEY};
            res[STREAM_ID_KEY] = $this.session.camToken;
            res[CAM_STATE_KEY] = $this.session.state;
            $this._send(res);
        })
    }

    _startCam(callback){
        var $this = this;
        console.log('Start with state ', this.session.state);
        
        if (this.session.state == CAM_STATE_ON) {
            return callback(null);
        }

        this.mediaClient.startStream(this.session, onStart)
        function onStart(err) {
            if (err) return callback();
            $this.session.state = CAM_STATE_ON; 
            return callback(null);
        }
    }

    _stopCam(callback){
        var $this = this;
        console.log('Stop with state ', this.session.state);
        if (this.session.state === CAM_STATE_READY) {
            return callback(null);
        }
        
        this.mediaClient.stopStream(this.session, onStop);
        function onStop(err) {
            if (err) callback(err);  
            $this.session.state = CAM_STATE_READY;
            return callback(null);
        }
    }

    onSessionClose(evt) {
        console.log('Closing session');
        var $this = this;
        this.session.state = CAM_STATE_OFF;
        this.mediaClient.stopStream(this.session, (err) => {
            if (err) console.error(err);
        });
    }

    onSessionError(evt) {
        console.error(evt);
    }

    onError(err) {
        console.error(err);
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