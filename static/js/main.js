console.log( "Baiivan cam app says hi!" );

const USERNAME_KEY = 'username';
const PASSWORD_KEY = 'password';
const HAS_LOGGED_IN_KEY = "hasLoggedIn"
const CAM_KEY = 'cam';
const USER_KEY = 'user';
const TOKEN_KEY = 'token';
const NAME_KEY = 'name';
const ID_KEY = "id";

var vm = new Vue( {
  el: '#app',
  data: {
    message: '',
    username: '',
    password: '',
    camName: '',
    camId: null,
    authUrl: config.BASE_URL + config.AUTH_URL,
    camUrl: config.BASE_URL + config.CAM_URL,
    hasLoggedIn : false,
  },
  created: function () {
    this._hasLoggedIn();
  },
  methods: {
    logIn: function() {
      var $this = this;
      var userInfo = {}
      userInfo[ USERNAME_KEY ] = this[ USERNAME_KEY ];
      userInfo[ PASSWORD_KEY ] = this[ PASSWORD_KEY ];
      var hasValidated = this._validate( userInfo );

      if ( !hasValidated ) {
        this.message = hasValidated[1]
      }
      $.post( {
        url: this.authUrl,
        data: {
          username: this.username,
          password: this.password
        },
        success: function( res, status, obj ) {
          $this.message = 'Login successful.';
          console.log( '==> Login has been successfull.' );
          console.log( res );
          $this.hasLoggedIn = true;
          $this._getCam();
        },
        error: function( obj, status, err ) {
          console.info( obj.error )
        }
      } );  
    },
    logOut: function() {
      var $this = this;
      $.ajax( {
        method: 'DELETE',
        url: this.authUrl,
        success: function( res, status, obj ) {
          $this.message = 'Logout successful.';
          console.log( '==> Logout has been successful.' );
          $this.hasLoggedIn = false;
          $this.camId = null;
          $this.camName = null;
        },
        error: function( obj, status, err ) {
          console.info( status )
          console.info( obj.responseText );
        }
      });  
    },

    submitCam: function() {
      var $this = this;
      this._postCam();
    },

    _hasLoggedIn: function() {
      var $this = this;
      $.get( {
        url: this.authUrl,
        success: function( res, status, obj ) {
          $this.message = ''; 
          console.log( '==> Has logged in?: ')
          console.log( res );

          $this[ USERNAME_KEY ] = res[ USER_KEY ][ USERNAME_KEY ];
          $this[ HAS_LOGGED_IN_KEY ] = true;
          $this._getCam();
          
        },
        error: function( obj, status, err ) {
          console.info( status )
          console.info( obj.responseText );
        }
      });  
    },

    _postCam: function( method ) {
      var $this = this;
      $.ajax({
        url: this.camUrl,
        method: 'POST',
        data: {
          name: $this.camName,
          id: $this.camId
        },
        success: function( res, status, obj ) {
          console.log( status )
          console.log( res )
        },
        error: function( obj, err, status ) {
          console.info( status )
          console.info( obj.responseText );
        }
      });
    },

    _getCam: function() {
      var $this = this;
      $.get( {
        url: this.camUrl,
        success: function( res, status, statusObj ) {
          console.info( res )
          let cam = res[ CAM_KEY ];
          if ( cam && cam[ TOKEN_KEY ]) {

            $this.camName = cam[ NAME_KEY ];
            $this.camId = cam[ ID_KEY ];
          } else {
            $this.camName = "Some cam";
          }
        },
        error: function( obj, status, err ) {
          console.info( status )
          console.info( obj.responseText );
        }
      });
    },

    _validate: function( userInfo ) {
      if ( !userInfo[ USERNAME_KEY ] || userInfo[ USERNAME_KEY ].length < 1 ) return [ false, 'Invalid username.' ];
      if ( !userInfo[ PASSWORD_KEY ] || userInfo[ PASSWORD_KEY ].length < 8 ) return [ false, 'Invalid password.' ];
      return [ true, null ];
    }
  }, 
});


