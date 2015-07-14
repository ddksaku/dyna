var DownloadDatabaseService = function() {
    var serviceUrl;

    this.initialize = function(url) {
        serviceUrl = url;        
    };    
        
    this.getTable = function(tableName, lastUpdated) {        
        return $.ajax({            
            url: serviceUrl,
            data: {
                username: app.user.name,
                password: app.user.password,
                table: tableName,
                updated: lastUpdated
            }            
        });
    };     
    
    this.getAllTables = function() {        
        return $.ajax({
            url: serviceUrl,
            data: {
                username: app.user.name,
                password: app.user.password
            }            
        });
    };
};