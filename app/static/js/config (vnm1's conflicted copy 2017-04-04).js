var config = (function () {
    return {
        'test': {
            BASE_URL: "http://localhost:8444",
            SIGNAL_URL: "wss://localhost:8433/cam",
            CAM_URL: '/cams',
            AUTH_URL: '/auth',
            
        },
        'dev': {
            BASE_URL: "http://localhost:8444",
            SIGNAL_URL: "wss://localhost:8433/cam",
            CAM_URL: '/cams',
            AUTH_URL: '/auth',
            
        },
        'stage': {
            BASE_URL: "http://localhost:8444",
            SIGNAL_URL: "wss://home.vnm.io:8433/cam",
            CAM_URL: '/cams',
            AUTH_URL: '/auth',
        
        }, 
        'prod': {
            BASE_URL: "http://localhost:8444",
            SIGNAL_URL: "wss://home.vnm.io:8433/cam",
            CAM_URL: '/cams',
            AUTH_URL: '/auth',
        
        }
    }
}());