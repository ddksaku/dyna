function GeolocationHelper() {    
}

GeolocationHelper.prototype = {
    options: { 
        timeout: 5000 
    },
    
    getCurrentPosition: function(onSuccess, onError) {                      
        navigator.geolocation.getCurrentPosition(onSuccess, onError, this.options);
    }, 
    
    watchPosition: function(onSuccess, onError) {      
        var watchId = navigator.geolocation.watchPosition(onSuccess, onError, this.options);
        return watchId;
    }, 
    
    clearWatch: function(watchId) {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);            
        }
    }            
};
