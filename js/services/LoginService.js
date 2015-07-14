var LoginService = function() {    
    var serviceUrl;    

    this.initialize = function(url) {
        serviceUrl = url;        
    };    

    this.login = function(userName, password) {                
        return $.ajax({                        
            url: serviceUrl,
            data: {
                username: userName,
                password: password,
                appVersion: app.version
            }            
        });
    };        
};