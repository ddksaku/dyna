function ConnectionHelper() { 
}

ConnectionHelper.prototype = {
    checkConnection: function() {
        if (app.isTestingMode === true) {
            return true;
        }
        
        var networkState = navigator.connection.type;
        if(networkState === Connection.NONE || networkState === Connection.UNKNOWN) {
            return false;
        }
        
        return true;
    }
};



