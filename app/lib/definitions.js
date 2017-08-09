const d = {}

d.DISPATCHTER_ONE_TO_MANY = 'DispatcherOneToMany'



d.STREAM_ID = 'stream_id';
d.SDP_OFFER = 'sdp_offer';
d.SDP_ANSWER = 'sdp_answer';
d.STREAM_START = 'stream_start';
d.STREAM_STOP = 'stream_stop';
d.ICE_CANDIATE = 'ice_candidate';


d.HLS_STREAM_START = 'hls_stream_start';
d.HLS_LINK = 'hls_link';
d.WEBRTC_ENDPOINT = 'WebRtcEndpoint';
d.RTP_ENDPOINT = 'RtpEndpoint';
d.CLIENT_TYPE = 'client_type';
d.ENDPOINT_ID = 'endpoint_id';
d.STREAM_TYPE = "stream_type"
d.STREAM_TYPE_RTP  = "RTP"

d.MEDIA_STATE = 'media_state';
d.MEDIA_FLOW = 'media_flow';
d.MEDIA_FLOWING = 'FLOWING';
d.MEDIA_NOT_FLOWING = 'NOT_FLOWING';


d.CAM_MODE = 'cam_mode';
d.CAM_MODE_ACTIVE = 1;
d.CAM_MODE_PASSIVE = 0;

d.CAM_STATE = 'cam_state';
d.CAM_STATE_ON = 2;
d.CAM_STATE_READY = 1;
d.CAM_STATE_OFF = 0;



d.CLOSE = 'close';
d.ERROR = 'error';
d.MESSAGE = 'message';

module.exports = d;