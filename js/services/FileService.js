var FileService = function() {
    var serviceUrl;

    this.initialize = function(url) {
        serviceUrl = url;        
    };    
    
    this.getFile = function(fileName) {        
        return $.ajax({
            url: serviceUrl,
            data: {
                username: app.user.name,
                password: app.user.password,
                file: fileName
            }
        });
    }; 
    
    this.getAllFiles = function() {
        return $.ajax({
            url: serviceUrl,
            data: {
                username: app.user.name,
                password: app.user.password             
            }
        });
    };
};