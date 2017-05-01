
var ws = new WebSocket('wss://' + location.host + '/cams');
var state = null;
const I_CAN_START = 0;
const I_CAN_STOP = 1;
const I_AM_STARTING = 2;

window.onload = function() {
  console = new Console();
  console.log('Page loaded ...');
  setState(I_CAN_START);
}


ws.onmessage = function(message) {
  var parsedMessage = JSON.parse(message.data);
  console.info('Received message: ' + message.data);
  switch (parsedMessage.id) {
  case 'start':
    start()
    break;
  case 'error':
    onError('Error message from server: ' + parsedMessage.message);
    break;
  default:
    onError('Unrecognized message', parsedMessage);
  }
}

function start() {
  setState(I_AM_STARTING);
  console.log('Starting talking to the peer server ...')

  var message = {
    id: 'startConfirmed', 
    message: 'Start has been confirmed.'
  };
  sendMessage(message, function(){
    setState(I_CAN_START);
  });
}

function stop() {
  setState(I_CAN_START);
  console.log('Stopping.')
}

function sendMessage(message, callback) {
  var jsonMessage = JSON.stringify(message);
  console.log('Senging message: ' + jsonMessage);
  ws.send(jsonMessage);
  callback()
}

function setState(nextState) {
  switch (nextState) {
  case I_CAN_START:
    $('#start').attr('disabled', false);
    $('#start').attr('onclick', 'start()');
    $('#stop').attr('disabled', true);
    $('#stop').removeAttr('onclick');
    break;

  case I_CAN_STOP:
    $('#start').attr('disabled', true);
    $('#stop').attr('disabled', false);
    $('#stop').attr('onclick', 'stop()');
    break;

  case I_AM_STARTING:
    $('#start').attr('disabled', true);
    $('#start').removeAttr('onclick');
    $('#stop').attr('disabled', true);
    $('#stop').removeAttr('onclick');
    break;

  default:
    onError('Unknown state ' + nextState);
    return;
  }
  state = nextState;
}