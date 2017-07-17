

module.exports = function AuthService(request) {
	
	this.request = request
	

	this.verifyToken = function (url, creds, callback) {
	    
	    console.log(creds.ACCESS_TOKEN)
	    this.request.get({ 
	        url: url,
	        json: true,
	        headers: { 'Authorization': 'Bearer ' + creds.ACCESS_TOKEN } 
	    }, onRequest);
	    
	    function onRequest(err, res, body) {
	        if (err) return callback(err)

			if (res.statusCode === 200) {
				console.info(res.body)
	       		return callback(null, res, body)
			}

			if (res.statusCode === 403 || res.statusCode === 401) {
				return callback(null, res)
			}

	       	return callback(res.statusCode)
	    }
	}


	this.refreshToken = function(url, creds, callback) {
		console.log('Refresh')

	    this.request.post({ 
	        url: url,
	        json: true,
	        body: { 
	            grant_type: 'refresh_token', 
	            refresh_token: creds.REFRESH_TOKEN 
	        },
	        auth: {
	            'user': creds.CLIENT_ID,
	            'pass': creds.CLIENT_SECRET,
	        }
	    }, onRequest);

	    function onRequest(err, res, body) {

	    	if (err) return callback(err)
	    	
	    	if (res.statusCode !== 200) {
				return callback(res.statusCode)
			}

	       	return callback(null, res, body)
	    }
	}




	this.list = function(url, creds, callback) {
		console.info('Listing cams')
		this.request.get({ 
	        url: url,
	        json: true,
	        
	        headers: {
	        	'Authorization': 'Bearer ' + creds.ACCESS_TOKEN
	        }
	    }, callback);

	}


	
}