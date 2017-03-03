console.log( "Baiivan cam app says hi!" );
 
var vm = new Vue( {
  el: '#app',
  data: {
    username: '',
    password: '',
    camName: 'Some cam',
    baseUrl: 'http://localhost:8444',
    isAuthed : false,
  },
  created: function () {
    this.checkAuth();
  },
  methods: {
    auth: function() {
      var $this = this;
      $.post( {
        url : this.baseUrl + '/auth',
        data: {
          username: this.username,
          password: this.password,
          camName: this.camName,
        },
        success: function( res, status, obj ) {
          console.log( 'Auth successfull.' );
          console.log( res );
          $this.camName = res.cam.name;
          $this.isAuthed = true;
        },
        error: function( obj, status, err ) {
          console.info( obj.responseText );
        }
      } );  
    },
    logout: function() {
      var $this = this;
      $.ajax( {
        method: 'DELETE',
        url: this.baseUrl + '/auth',
        success: function( res, status, obj ) {
          console.log( 'Logout successful.' );
          $this.isAuthed = false;
        },
        error: function( obj, status, err ) {
          console.info( obj.responseText );
        }
      } );  
    },
    checkAuth: function() {
      console.log( 'Checking auth @ ' + this.baseUrl + '/is-authed.' );
      var $this = this;
      $.get( {
        url : this.baseUrl + '/auth',
        success: function( res, status, obj ) {
          console.log( 'Checking auth is successful. Is authed: ' + res.is_authed + '.');
          console.log( res );
          if ( res.is_authed ) {
            $this.username = res.user.username;
            $this.camName = res.cam.name;
            $this.isAuthed = res.is_authed;
          }
        },
        error: function( obj, status, err ) {
          console.info( obj.responseText );
        }
      } );  
    },
  }, 
});


