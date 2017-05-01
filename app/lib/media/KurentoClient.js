/**
 * Baiivan.
 * By Georgy St. Georgiev, 2017.
 * CameraHandler.js
 */

'use strict';
// Libs.
const os = require('os');
const path = require('path');
const http = require('http');
const request = require('request');
const getmac = require('getmac');
const config = require('config');
const child = require('child_process');
const terminate = require('terminate');

// Constants
const SDP_ANSWER_KEY = 'sdp_answer';
const PORT_KEY = 'port';
const HOST_KEY = 'host';
const VIDEO_STREAM_TYPE_KEY = 'video_type';
const VIDEO_ONLY_VP8 = 'video_only_vp8';
const VIDEO_ONLY_H264 = 'video_only_h264';
const VIDEO_ONLY_H264_TEST = 'video_only_h264_test';

class KurentoClient { 

  generateOffer(callback) {
    const sdpOffer = 
      "v=0\n" + 
      "o=- 0 0 IN IP4 0.0.0.0\n" + 
      "s=Cam\n" + 
      "c=IN IP4 0.0.0.0\n" + 
      "t=0 0\n" + 
      "m=video 5200 RTP/AVP 96 97\n" + 
      "a=sendonly\n" + 
      "a=rtpmap:96 H264/90000\n" +
      "a=rtpmap:97 VP8/90000";
    
    return callback(null, sdpOffer);
  }

  generateStreamId(cam_token) {
    return cam_token + ':' + '0' + ':' + 'src' + ':' + 'RtpEndpoint';
  }
  
  processAnswer(sdpAnswer, callback) {
    //console.log(sdpAnswer)
    var res = this._parseSdp(sdpAnswer);
    var host = res[0];
    var port = res[1];
    if (!host || !port) {
      return callback ('Could not parse sdp answer.');
    }
    return callback(null, {host: host, port: port}); 
  }


  startStream(session, callback) {   
    console.log('Setting opts')
    if (!session[HOST_KEY] || !session[PORT_KEY]) {
      return callback('No host or port provided.')
    }

    console.log('Setting opts2')
    var opts = {};
    opts[VIDEO_STREAM_TYPE_KEY] = config.VIDEO_STREAM_TYPE;
    opts[HOST_KEY] = session[HOST_KEY];
    opts[PORT_KEY] = session[PORT_KEY];
    console.log('Opts are ', opts)
    session.streamProc = this._spawnGstreamer(opts);
    return callback(null);
  }

  stopStream(session, callback) {
    this._killProcess(session.streamProc, callback);
  } 

  _parseSdp(sdp){
    var arr = sdp.split('\n');
    if (arr.length < 5) {
      return [null, null];
    }
    var host = arr[3].split(" ")[2];
    var port = arr[5].split(" ")[1];
    
    return [host, port]
  }

  _spawnGstreamer(opts) {
  
      var src = null;
      var encoding = null;
      var args = null;
      


      console.log('Host ', opts.host)
      console.log('Port ' + opts.port)
      


      var videoconvert = ['!', 'queue', '!', 'videorate',
          '!', 'videoconvert', '!', 'videoscale', '!', 
          'video/x-raw,width=640,height=480,framerate=30/1']

      var sink = ['!', 'udpsink', 'host=' + opts.host, 'port=' + opts.port]; 

      switch (opts[VIDEO_STREAM_TYPE_KEY]) {
      case (VIDEO_ONLY_VP8):
          src =  ['v4l2src', 'device=/dev/video0'];
          encoding = ['!', 'vp8enc', '!', 'rtpvp8pay', 'pt=97'];
          break;
      case (VIDEO_ONLY_H264):
          src =  ['v4l2src', 'device=/dev/video0'];
          encoding = ['!', 'x264enc', 'tune=zerolatency', '!', 'rtph264pay', 'pt=96'];
          break;
      case (VIDEO_ONLY_H264_TEST):
          src =  ['videotestsrc', 'pattern=0'];
          encoding = ['!', 'x264enc', 'tune=zerolatency', '!', 'rtph264pay', 'pt=96'];
          break;
      default:
          src =  ['videotestsrc', 'pattern=0'];
          encoding = ['!', 'x264enc', 'tune=zerolatency', '!', 'rtph264pay', 'pt=96'];
          break;
      }

      args = src.concat(videoconvert).concat(encoding).concat(sink);
    

      const cmd = '/usr/local/bin/gst-launch-1.0';
      var proc = child.spawn(cmd, args, {detached: true});
      
      // on error
      proc.stderr.on('data', (err) => {
        //this._killProcess(proc, () => {});
      });
      
      // on exit
      proc.on('exit', () => {
        //this._killProcess(proc, () => {});
      });
      
      //proc.stdout.on('data', (data) => {});
      console.log('==> Spawn a process with pid : ', proc.pid)
      return proc;
  }

  _killProcess(proc, callback) {
    
    if (!proc) {
      return callback ('No gstreamer process to kill.');
    }
    console.log('==> Kill a process with pid : ', proc.pid)
    proc.kill('SIGINT');
 
    return callback(null);
  }

}

module.exports = KurentoClient;