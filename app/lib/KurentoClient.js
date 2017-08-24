/**
 * Pongcam
 * By Georgy St. Georgiev, 2017.
 * KurentoClient.js
 */

'use strict'

const ENV = process.env.NODE_ENV

const LIB = './'
const config = require('config')
const spawn = require('child_process').spawn
const logger = console
const d = require(LIB + 'definitions')


class KurentoClient { 


  startStream(opts, callback) {   

    if (!opts.host || !opts.port ) return callback('No host or port provided.')

    const proc = this.spawnGstreamer(opts)

    callback(null, proc)
  }


  stopStream(proc, callback) {

    if (!proc) return callback('stopStream: No process provided.')

    this.killProcess(proc, callback)
  } 


  generateOffer() {

    const sdpOffer = 
      "v=0\n" + 
      "o=- 0 0 IN IP4 " + config.server.ip + "\n" + 
      "s=Cam\n" + 
      "c=IN IP4 " + config.server.ip + "\n" +
      "t=0 0\n" + 
      "m=video 5200 RTP/AVP 96 97\n" + 
      "a=sendonly\n" + 
      "a=rtpmap:96 H264/90000\n" +
      "a=rtpmap:97 VP8/90000"

    return sdpOffer
  }


  processAnswer(answer, callback) {

    const res = this.parseSdp(answer)
    if (!res.host || !res.port) {
      return callback ('processAnswer: Could not parse the sdp answer.')
    }

    callback(null, res) 
  }


  parseSdp(sdp){
    
    const arr = sdp.split('\n')

    if (arr.length < 5) return [null, null]

    const host = arr[3].split(" ")[2]
    const port = arr[5].split(" ")[1]
    
    return { host: host, port: port }
  }


  spawnGstreamer(opts) {
    logger.info('Spawning process.')
    var shellCmd = null
    const ENCODING_TYPE = config.video.encoding
    const SRC_TYPE = config.video.src
    const SRC_RASPIVID = d.VIDEO_SRC.RASPIVID

    const raspividCmd = 
      '/usr/bin/raspivid --nopreview -hf -vf' + 
      ' --width ' + config.video.width + 
      ' --height ' + config.video.height + 
      ' --framerate '  + config.video.framerate + 
      ' --bitrate 1000000' + 
      ' --profile baseline' +
      ' --timeout 0 -o -'
    
    const gstreamerCmd = '/usr/local/bin/gst-launch-1.0'

    const videoconvert = 
      'queue ! videorate ! videoconvert ! videoscale ! ' + 
      'video/x-raw,' + 
      'width=' + config.video.width + ',' + 
      'height=' + config.video.height + ',' +
      'framerate=' + config.video.framerate

    const srcTypes = { 
      test: 'videotestsrc pattern=0' + ' ! ' + videoconvert, 
      v4l2: 'v4l2src device=/dev/video0' + ' ! ' + videoconvert,
      raspivid: 'fdsrc ! h264parse'
    }

    const encodingTypes = {
      h264: 'x264enc tune=zerolatency ! rtph264pay config-interval=1 pt=96',
      vp8: 'vp8enc ! rtpvp8pay pt=97'
    }

    const src = gstreamerCmd + ' ' + srcTypes[SRC_TYPE]
    const encoding = encodingTypes[ENCODING_TYPE]
    const sink = 'udpsink host=' + config.server.ip + ' port=' + opts.port 

    if (SRC_TYPE === SRC_RASPIVID) {
      shellCmd = raspividCmd + ' | ' +  src + ' ! ' + sink
    } else {
      shellCmd = src + ' ! ' + encoding + ' ! ' + sink
    }

    logger.info('A process candidate: ', shellCmd)

    const proc = spawn('sh', ['-c', shellCmd], { stdio: 'inherit' });
    
    logger.info('Spawned the process with pid: ', proc.pid)
    
    return proc
  }


  killProcess(proc, callback) {
    
    if (!proc) return callback ('killProcess: No process to kill.')

    try {
      proc.kill('SIGINT')
      logger.info('Killed a process with pid : ', proc.pid)
    } catch(e) {
      logger.trace(e)
    }
 
    return callback(null)
  }


  killProcessById(procID) {

    if (!procID) return callback ('killProcess: No process to kill.')

    try {
        //process.kill(proc.pid)
        spawn('kill', [procID])
    } catch(e) {
        logger.error(e)
    }
  }


  killAll() {
    spawn('pkill', ['gst'])
  }


}

module.exports = KurentoClient
