/**
 * Baiivan.
 * By Georgy St. Georgiev, 2017.
 * OAuthService.js
 */

'use strict'

const ENV = process.env.NODE_ENV

const LIB = './'

const d = require(LIB + 'definitions')
const logger = require(LIB + 'logger')


class OAuthService {
	
	constructor(request) {
		this.request = request
	}

	

	verifyToken(url, creds, callback) {
	    
	    this.request.get({ 
	        url: url,
	        json: true,
	        headers: { 'Authorization': 'Bearer ' + creds.access_token } 
	    }, onRequest);
	    
	    function onRequest(err, res, body) {
	        if (err) return callback(err)

			if (res.statusCode === 200) {
	       		return callback(null, res, body)
			}

			if (res.statusCode === 403 || res.statusCode === 401) {
				return callback(null, res)
			}

	       	return callback(res.statusCode)
	    }
	}


	refreshToken(url, creds, callback) {
	
	    this.request.post({ 
	        url: url,
	        json: true,
	        body: { 
	            refresh_token: creds.refresh_token 
	        },
	        auth: {
	            'user': creds.client_id,
	            'pass': creds.client_secret,
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


	get(url, creds, callback) {

		this.request.get({ 
	        url: url,
	        json: true,
	        headers: { 'Authorization': 'Bearer ' + creds.access_token }
	    }, callback);

	}


	
}


module.exports = OAuthService