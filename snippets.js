///////
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Ignore warning for self-signed certificates
////////
app.post('/app-server', function(req, res) {
    
    const body = req.body
    //console.log(body)
    
    
    const headers = {};
    if (body.headers) {
        var header_items = body.headers.split(';')
        header_items.forEach(function(item){
            item_pair = item.split(':');
            if (item_pair.length == 2) {
                headers[item_pair[0]] = item_pair[1];
            }
        })
    }
   
    var options = {
        method: body.method, 
        baseUrl: baseUrl, 
        url: body.url, 
        headers: headers
    }

    if (body.method == "POST") {
        console.log(body)
        options['form'] = body
    }

    request(options, function (error, response, body) {
        console.log('headers', response.headers)
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
       
        var parsedBody = {}
        if (body) {
            console.log('body:', body);
            parsedBody = JSON.parse(body);
        }

        if (response && (response.statusCode == 200 || response.statusCode == 201)) {
            res.json(parsedBody);
        } else {
            res.status(response.statusCode).send('Server is not happy :|');
        }
    });
});



////////////
///


/**
 * Client setup
 */

const wss = new ws(argv.singaling_server_uri, {
    perMessageDeflate: false
});

wss.on('open', function open() {
    console.log('Connection opened to ' + argv.singaling_server_uri);
    wss.send(JSON.stringify({
        id: 'cams',
        message: "Hola fore!"
    }));
});

wss.on('message', function incoming(_data, flags) {
    var data = JSON.parse(_data);
    switch (data.id) {
    case 'cams-answer':
        console.log('Message received: ', data.message);
    default:
        break;    
    }
  // flags.binary will be set if a binary data is received.
  // flags.masked will be set if the data was masked.
});




const client = new WebSocketClient();
 
client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});
 
client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        }
    });
    
    function sendNumber() {
        if (connection.connected) {
            var number = Math.round(Math.random() * 0xFFFFFF);
            connection.sendUTF(number.toString());
            setTimeout(sendNumber, 1000);
        }
    }
    sendNumber();
});

client.connect('wss://localhost:8443', 'cams');




////////
app.use(cookieParser());
var sessionHandler = session({
    secret : 'none',
    rolling : true,
    resave : true,
    saveUninitialized : true
});
app.use(sessionHandler);

//////
// Server - Phase I

const path = require('path');
const url = require('url');
const cookieParser = require('cookie-parser')
const express = require('express');
const session = require('express-session')
const minimist = require('minimist');
const ws = require('ws');
const kurento = require('kurento-client');
const fs    = require('fs');
const https = require('https');


const argv = minimist(process.argv.slice(2), {
    default: {
        local_server_uri: 'https://localhost:8444/',
        singaling_server_uri: 'wss://localhost:8443/cams'
    }
});

const options =
{
  key:  fs.readFileSync('keys/server.key'),
  cert: fs.readFileSync('keys/server.crt')
};

// Ignore warning for self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var app = express();
/*
 * Management of sessions
 */
app.use(cookieParser());

var sessionHandler = session({
    secret : 'none',
    rolling : true,
    resave : true,
    saveUninitialized : true
});

app.use(sessionHandler);




/*
 * Definition of global variables.
 */
var sessions = {};
var kurentoClient = null;


/*
 * Server startup
 */
var localUrl = url.parse(argv.local_server_uri);
var port = localUrl.port;
var server = https.createServer(options, app).listen(port, function() {
    console.log('Cam server started.');
    console.log('Open ' + url.format(localUrl) + ' with a WebRTC capable browser');
});

var wss = new ws.Server({
    server : server,
    path : '/cams'
});


wss.on('connection', function(ws) {
    var sessionId = null;
    var request = ws.upgradeReq;
    var response = {
        writeHead : {}
    };


    sessionHandler(request, response, function(err) {
        sessionId = request.session.id;
        console.log('Connection received with sessionId ' + sessionId);
    });
 
    ws.on('message', function(_message) {
        var message = JSON.parse(_message);
        switch (message.id) {
        case 'start':
            break;
        case 'stop':
            break;

        default:
            break;
        }
    });

    ws.on('error', function(error) {
        console.log('Connection ' + sessionId + ' error');
    });

    ws.on('close', function() {
        console.log('Connection ' + sessionId + ' closed');
    });
});

/*
 * WebSocket client
 */

var client = new ws(argv.singaling_server_uri)

client.on('open', function(m) {
    console.log('Connection opened to signalling server.')
    client.send(JSON.stringify({
        id : 'camCalling',
        message : "Holla, bitches!",
        uri: "wss://" + localUrl.host + "/cams"
    }));
});
 
client.on('message', function (_message, flags) {
    console.log('Message received');
    var message = JSON.parse(_message);
    //console.log(message);
    switch (message.id) {
    case 'rtpOffer':
        console.log("\n==>Offer is:")
        console.log(message.payload)
        sendMessage(client, {
            id: "rtpAnswer",
            payload: 
                "v=0\r\n" + 
                "o=- 3695122375 3695122375 IN IP4 0.0.0.0\r\n" + 
                "s=Camera One\r\n" + 
                "c=IN IP4 0.0.0.0\r\n" + 
                "t=0 0\r\n" + 
                "m=audio 5200/2 RTP/AVPF 96 0 97\r\n" + 
                "a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n" + 
                "a=rtpmap:96 opus/48000/2\r\n" + 
                "a=rtpmap:97 AMR/8000\r\n" + 
                "a=mid:audio0\r\n" + 
                "a=ssrc:554359903 cname:user70565615@host-e49ed4e\r\n" + 
                "m=video 5200/2 RTP/AVPF 102 103\r\n" + 
                "a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n" + 
                "a=rtpmap:102 VP8/90000\r\n" + 
                "a=rtpmap:103 H264/90000\r\n" + 
                "a=mid:video0\r\n" + 
                "a=rtcp-fb:102 nack\r\n" + 
                "a=rtcp-fb:102 nack pli\r\n" + 
                "a=rtcp-fb:102 ccm fir\r\n" + 
                "a=rtcp-fb:103 nack\r\n" + 
                "a=rtcp-fb:103 nack pli\r\n" + 
                "a=rtcp-fb:103 ccm fir\r\n" + 
                "a=ssrc:2928770360 cname:user70565615@host-e49ed4e\r\n"
            }
        );
        break
        
        break

    }
  // flags.binary will be set if a binary data is received. 
  // flags.masked will be set if the data was masked. 
});


client.on('error', function(error) {
    console.log("\n==> Error:")
    console.error(error)
});

//setTimeout(function(){
    
//}, 1000)
    


/*
 * Definition of functions
 */

// Recover kurentoClient for the first time.
function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }

    kurento(argv.ws_uri, function(error, _kurentoClient) {
        if (error) {
            console.log("Could not find media server at address " + argv.ws_uri);
            return callback("Could not find media server at address" + argv.ws_uri
                    + ". Exiting with error " + error);
        }

        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}


/*
 * Basic functions
 */
function onStart(sessionId, ws, sdpWebRtcOffer, callback) {
    console.log('\n==> Starting ...\n')
}

function onConnection() {

}

function onStop(sessionId) {
    if (sessions[sessionId]) {
        console.info('Releasing pipeline');
        delete sessions[sessionId];
    }
}

function onError(error) {
  if(error)
  {
    console.error(error);
  }
}


function sendMessage(ws, message) {
    var jsonMessage = JSON.stringify(message);
    console.log('Senging message: ' + jsonMessage);
    ws.send(jsonMessage);
}



app.use(express.static(path.join(__dirname, 'static')));