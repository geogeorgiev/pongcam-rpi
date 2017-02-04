/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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