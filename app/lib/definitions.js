const d = {}

d.AUTH = 'auth'
d.START = 'start'
d.STOP = 'stop'
d.CAM_EVENT = 'cam_event'
d.OFFER = 'offer'
d.ANSWER = 'answer'
d.CMD = 'cmd'
d.MJPEG_STREAM = 'mjpeg_stream'
d.RELOAD = 'reload'
d.CONFIG = 'config'
d.STREAM_TYPE_KEY = "stream_type"
d.STREAM_TYPE = {
	RTP: "RTP"
}

d.VIDEO_SRC_KEY = 'video_src'
d.VIDEO_SRC = {
	RASPIVID: 'raspivid',
	TEST: 'test',
	V4L2: 'v4l2'
}

d.VIDEO_FORMAT_KEY = 'video_format'
d.VIDEO_FORMAT = {
	H264: 'h264',
	VP8: 'vp8'
}
d.CLOSE = 'close'
d.ERROR = 'error'
d.MESSAGE = 'message'

module.exports = d