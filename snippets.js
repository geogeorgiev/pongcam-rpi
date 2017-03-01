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