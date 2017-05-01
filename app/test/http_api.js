//During the test the env variable is set to test
'use strict';

process.env.NODE_ENV = 'test';

//Require the dev-dependencies
const chai = require( 'chai' );
const chaiHttp = require( 'chai-http' ) ;
const sinon = require( 'sinon' );
const server = require( '../server' );
const should = chai.should();
const config = require('config');

const camTokenKey = 'cam_token';
const userTokenKey = 'user_token';
const camKeys = [ 'host', 'hardware_id', 'name', camTokenKey ];
const userKeys = [ 'username', 'password', userTokenKey ];
const correctUserCreds = { username: 'user', password: 'pass' };
const user_token = '1234567890abcdefghi';
const cam_token = 'abcdefghi1234567890';
const hardware_id = 'ab:12:cd:34:ef';

const appServerUrl = config.APP_API.base;
const authUrl = appServerUrl + config.APP_API.auth;
const camsUrl = appServerUrl + config.APP_API.cams;

chai.use(chaiHttp);

function stubRemoteServer( opts, callback ) {
  switch ( opts.url ) {
  case ( authUrl ):
    if ( opts.form.username == correctUserCreds.username && opts.form.password == correctUserCreds.password ) {
      callback( null, { headers: { "Content-Type": "application/json" }, statusCode: 200 }, JSON.stringify( { token: user_token } ) );
    } else {
      callback( null, { headers: {}, statusCode: 400 }, null );
    }
    break;
  case ( camsUrl ): 
    let token = opts.headers[ "Authorization" ].split(" ")[ 1 ];
    if ( token == user_token ) {
      callback( null, { headers:  { "Content-Type": "application/json" }, statusCode: 201 }, JSON.stringify( { name: 'Cam', token: cam_token, hardware_id: opts.form.hardware_id, host: opts.form.host } ) ); 
    } else {
      callback( null, { headers: {}, statusCode: 401 }, null );
    }
    break;
  default:
    break;
  }
}

describe( 'API', function() {
  before( function() {
    // The before() callback gets run before all tests in the suite. Do one-time setup here.
  } );
  beforeEach( function( done ) { //Before each test we empty the database
    server.store.clear();
    done();     
  } );
  describe( '/GET auth 1', function() {
    it( 'Check whether has authenticated should return false.', function( done ) {
      chai.request( server.app )
        .get( config.LOCAL_API.auth )
        .end( function( err, res ) {
          res.should.have.status( 200 );
          res.body.should.be.a( 'object' );
          res.body.should.not.have.property( 'cam' );
          res.body.should.not.have.property( 'user' );
          res.body.should.have.property( 'is_authed' );
          res.body.is_authed.should.be.not.ok;
          done();
      } );
    } );
  } );
  describe( '/GET auth 2', function() {
    it( 'Check whether has authenticated should return true.', function( done ) {
      server.store.setItem( camTokenKey , "123abc" );
      server.store.setItem( userTokenKey , "123abc" );
      chai.request( server.app )
        .get( config.LOCAL_API.auth )
        .end( function( err, res ) {
          res.should.have.status( 200 );
          res.body.should.be.a( 'object' );
          res.body.should.have.property( 'cam' );
          res.body.should.have.property( 'user' );
          res.body.should.have.property( 'is_authed' );
          res.body.is_authed.should.be.ok;
          done();
      } );
    } );
  } );
  describe( '/POST auth 1', function() {
    it( 'Succeed to authenticate.', function( done ) {
      server.app.httpClient = stubRemoteServer;
      chai.request( server.app )
        .post( config.LOCAL_API.auth )
        .send( {
          username: correctUserCreds.username,
          password: correctUserCreds.password,
          name: 'camera',
        } )
        .end( function( err, res ) {
          res.should.have.status( 200 );
          res.body.should.be.a( 'object' );
          res.body.should.have.property( 'cam' );
          res.body.should.have.property( 'user' );
          res.body.should.have.property( 'is_authed' );
          res.body.is_authed.should.be.ok;
          //res.body.errors.should.have.property('ok').eql(true);
          done();
      } );
    } );
  } );
  describe( '/POST auth 2', function() {
    it( 'Succeed to authenticate with a existing cam.', function( done ) {
      server.app.httpClient = stubRemoteServer;
      chai.request( server.app )
        .post( config.LOCAL_API.auth )
        .send( {
          username: correctUserCreds.username,
          password: 'xxx',
          name: 'camera',
        } )
        .end( function( err, res ) {
          res.should.not.have.status( 200 );
          done();
      } );
    } );
  } );
  after( function() {
    // The before() callback gets run before all tests in the suite. Do one-time setup here.
  } );
} );

