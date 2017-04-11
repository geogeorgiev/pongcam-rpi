'use strict';
process.env.NODE_ENV = 'test';
const chai = require( 'chai' );
const utils = require( '../lib/utils.js' );
const should = chai.should();
const ls = require( 'node-localstorage' )
const config = require('config');
const server = require( '../server' );
let env = process.env.NODE_ENV
let localStorage = new ls.LocalStorage( config.LOCAL_STORAGE_DIR + "/" + env );
let store = new utils.Storage( localStorage );


describe( 'API help funcs', function() {
  beforeEach( function( done ) { //Before each test we empty the database
    store.clear();
    done();     
  });

/*
  * Test the /GET route
  */
  describe( 'checkAuth()', function() {
    it( 'YES.', function( done ) {
      store.setItem( 'cam_token', '123' );
      store.setItem( 'user_token', '321' );
      let isAuthed = server.checkAuth( store );
      isAuthed.should.be.ok;
      done();
    });
    it( 'NO 1.', function( done ) {
      store.setItem( 'user_token', '321' );
      let isAuthed = server.checkAuth( store );
      isAuthed.should.not.be.ok;
      done();
    });
    it( 'NO 2.', function( done ) {
      store.setItem( 'cam_token', '123' );
      let isAuthed = server.checkAuth( store );
      isAuthed.should.not.be.ok;
      done();
    });
  });
});