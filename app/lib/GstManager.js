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
const logger = require(LIB + 'logger')
const kill  = require('tree-kill')

class GstManager { 


  startMJPEGSender(opts, callback) {
    
    const srcs = { 
      test: 'videotestsrc pattern=ball is-live=true',
      v4l2: 'v4l2src device=/dev/video0'
    }

    var src = null
    if (config.video.src === 'test') {
      src = srcs.test
    } else {
      src = srcs.v4l2
    }

    const shellCmd = 
      '/usr/local/bin/gst-launch-1.0' + 
      ' ' + src + 
      ' ! "video/x-raw, width=' + config.video.width + 
      ', height=' + config.video.height + 
      ', framerate=' + config.video.framerate + '"' +  
      //' ! videoflip method=clockwise ! videoconvert' +
      ' ! jpegenc ! rtpjpegpay' +
      ' ! udpsink host=' + opts.host + ' port=' + opts.port 

    this.pid = spawn('sh', ['-c', shellCmd], { 
      detached: (ENV !== 'dev'), 
      stdio: 'inherit' 
    }).pid
    
    logger.info('Spawned a process with PID ', this.pid)

    callback(null, this.pid)
  }


  stopMJPEGSender(callback) {

    if (!this.pid) return
      
    kill(this.pid, 'SIGINT', (err) => {

      if (err) return callback(err)

      this.pid = null

      callback(null)
    })
  }

}

module.exports = GstManager
