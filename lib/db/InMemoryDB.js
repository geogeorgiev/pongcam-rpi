/*
 * Baiivans
 * Georgy St. Georgiev, 2017
 * InMemoryStore.js
 */

'use strict';

class InMemoryStore {
    
    constructor( storage ) {
      this.storage = storage;
    }

    _find( keyvals, callback ) {
      let $this = this;
      function f( keyvals, objs ) {
        let queryRes = [];
        if ( keyvals.length == 0 ) {
        
          return callback( null, objs );
        
        } else {
          
          let keyval = keyvals.shift();
          let key = keyval[0];
          let val = keyval[1];

          objs.forEach( ( o ) => {
            if ( o[key] == val ) {

              queryRes.push( o );
            }
          });
          
          f( keyvals, queryRes );
        }
      }
      
      f( keyvals, this.storage );
    }

    // !!! TEST !!!
    find( keyvals, callback ) {
      if ( !keyvals || !Array.isArray( keyvals ) || keyvals.length == 0 ) {
        return callback( 'Missing or incorrect arguments for find().' );
      }

      if ( !Array.isArray( keyvals[0] ) ) {
        keyvals = [ keyvals ]; 
      }
      
      this._find( keyvals, callback );
    }

    save( obj ) {
      this.storage.push( obj );
    }

    delete( keyvals, callback ) { 
      let $this = this;
      this.find( keyvals, ( err, res ) => {
        if ( err ) {  
          return callback( err ) 
        }
        
        res.forEach( ( r ) => {
          let index = res.indexOf( r );
          $this.storage.splice( index, 1 );
        });
        return callback( null );
      });
      
    }

}

module.exports = InMemoryStore;