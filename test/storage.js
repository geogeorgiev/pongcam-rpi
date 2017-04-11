'use strict';
process.env.NODE_ENV = 'test';
const chai = require( 'chai' );
const utils = require( '../lib/utils.js' );
const should = chai.should();
const ls = require( 'node-localstorage' )
const config = require('config');

let env = process.env.NODE_ENV
let localStorage = new ls.LocalStorage( config.LOCAL_STORAGE_DIR + "/" + env );
let store = new utils.Storage( localStorage );

const itemName = 'item_name';
const itemVal = '123abc';

describe( 'Utils', function() {
  beforeEach( function( done ) { //Before each test we empty the database
    store.clear();
    done();     
  });

/*
  * Test the /GET route
  */
  describe( 'Storage', function() {
    it( 'Check whether setItem and getItem work.', function( done ) {
      store.setItem( itemName, itemVal );
      store.getItem( itemName ).should.be.equal( itemVal );
      done();
    });
  });
});