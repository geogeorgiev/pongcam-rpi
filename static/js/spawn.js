var cmd = 'gst-launch-1.0';
var args = ['autovideosrc', 'horizontal-speed=1', 'is-live=true',
    '!', 'videoconvert',
    '!', 'vp8enc', 'cpu-used=5', 'deadline=1', 'keyframe-max-dist=10',
    '!', 'queue', 'leaky=1',
    '!', 'm.', 'autoaudiosrc',
    '!', 'audioconvert',
    '!', 'vorbisenc',
    '!', 'queue', 'leaky=1',
    '!', 'm.', 'webmmux', 'name=m', 'streamable=true',
    '!', 'queue', 'leaky=1',
    '!', 'tcpserversink', 'host=127.0.0.1', 'port=9001', 'sync-method=2'];

var child = require('child_process');
var gstreamer = child.spawn(cmd, args, {stdio: 'inherit'});

gstreamer.on('exit', function (code) {
    if (code != null) {
        console.log('GStreamer error, exit code ' + code);
    }
    process.exit();
});