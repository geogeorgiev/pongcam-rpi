// Local storage utility fuctions:
// 1)
let Storage = function(storage) {
    this.storage = storage;
    this.setLocalStorageObject = function( keys, dict ) {
        for ( let key of keys ) {
            if ( dict[ key ] ) {
                //console.log('Setting ', key)
                this.setItem( key, dict[ key ] );
            }
        }
        return true;
    };
    this.getLocalStorageObject = function( keys ) {
        let dict = {};
        for ( let key of keys ) {
            dict[ key ] = this.getItem( key );
        }
        return dict;
    };
    this.removeLocalStorageObject = function( keys ) {
        for ( let key of keys ) {
            this.removeItem( key );
        }
        return true;
    };
    this.getItem = function ( name ) {
        return this.storage.getItem( name );
    };
    this.setItem = function ( name, item ) {
        this.storage.setItem( name, item );
    };
    this.removeItem = function ( name ) {
        return this.storage.removeItem( name );
    };
    this.clear = function () {
        this.storage.clear();
    };
}



module.exports = {
    Storage: Storage
}