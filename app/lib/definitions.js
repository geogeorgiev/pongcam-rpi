const d = {}

d.AUTH = 'auth'

d.STREAM_ID = 'stream_id'
d.SDP_OFFER = 'sdp_offer'
d.SDP_ANSWER = 'sdp_answer'
d.STREAM_START = 'stream_start'
d.STREAM_STOP = 'stream_stop'
d.ICE_CANDIATE = 'ice_candidate'

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

d.MEDIA_STATE_KEY = 'media_state'

d.MEDIA_FLOW_KEY = 'media_flow'
d.MEDIA_FLOW = {
	FLOWING: 'FLOWING',
	NOT_FLOWING:'NOT_FLOWING'
}

d.CAM_MODE_KEY = 'cam_mode'
d.CAM_MODE = {
	PASSIVE: 0,
	ACTIVE: 1
}

d.CAM_STATE_KEY = 'cam_state'
d.CAM_STATE = {
	OFF: 0,
	READY: 1,
	ON: 2,
}

d.CLOSE = 'close'
d.ERROR = 'error'
d.MESSAGE = 'message'

module.exports = d