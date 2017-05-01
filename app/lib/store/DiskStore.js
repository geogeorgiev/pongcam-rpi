/*
 * Baiivans
 * Georgy St. Georgiev, 2017
 * DiskStore.js
 */

'use strict';

const config = require( 'config' );
const ls = require( 'node-localstorage' );
const env = process.env.NODE_ENV;

class DiskStore { 
    
    constructor( storagePath ) {
        this.storage = new ls.LocalStorage( storagePath );
    }
    
    get( key, callback ) {
        if ( !key ) return callback( 'missing key arg' );
        let item = this.storage.getItem( key );
        return callback( null, JSON.parse( item ) );
    }
    set( key, value ) {
        let val = JSON.stringify( value );
        if ( !key || !val ) return 1;
        this.storage.setItem( key, val );
        return 0;
    }

    delete( key ) {
        if ( !key ) return callback( 'missing key arg' );
        this.storage.removeItem( key );
        return 0;
    }

    setMultiple( keys, values, callback ) {
        $this = this;
        let res = [];
        if ( !keys || !Array.isArray( keys ) || !values || !Array.isArray( values ) ) {
            return callback( 'missing keys or values args' );
        }
        for ( let i = 0; i < keys.length; i++ ) {
            if ( !values[i]) {
                return callback( 'a missing value' );
            }
            $this.storage.setItem( keys[i], values[i] );
        }
        return callback( null ); 
    }

    getMultiple( keys, callback ) {
        $this = this;
        let res = [];
        if ( !keys || !Array.isArray(keys) ) {
            return callback( 'missing keys or values args' );
        }
        for ( let i = 0; i < keys.length; i++ ) {
            if ( $this.storage.getItem( keys[i] ) ) {
                res.push( $this.storage.getItem( keys[i] ) );
            }
        }
        return callback( null, res ); 
    }

    deleteMultiple( keys, callback ) {
        $this = this;
        let res = [];
        if ( !keys || !Array.isArray(keys) ) {
            return callback( 'missing keys args' );
        }
        for ( let i = 0; i < keys.length; i++ ) {
            $this.storage.removeItem( keys[i] );
        }
        return callback( null ); 
    }

    deleteAll() {
        this.storage.clear();
    }
}

module.exports = DiskStore;
