/**
*
*/

'use strict';

const config = require( 'config' );
const winston = require('winston');

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ 
            colorize: true,
            timestamp: true, 
            level: 'debug',
        }),
        new (winston.transports.File)({
            name: 'info',
            json: false,
            filename: 'logs/info.log',
            timestamp: true, 
            level: 'debug'
        }), 
        new (winston.transports.File)({
            name: 'warning-error',
            json: false,
            filename: 'logs/error.log',
            timestamp: true, 
            level: 'warn'
        }),
        new (winston.transports.File)({
            name: 'error-json',
            filename: 'logs/error.json.log',
            timestamp: true, 
            level: 'error'
        })
    ],
    /*exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    ]*/

});

module.exports = logger