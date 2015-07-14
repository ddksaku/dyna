var UploadDatabaseService = function() {            
    this.updateTable = function(tableName, columns, records) {    
        var json = {
            design: columns,            
            data: {
                records: records
            }
        };                               
        json = JSON.stringify(json).replace(/\'null\'/g, 'null'); // convert 'null' to null                
        
        return $.ajax({
            url: app.getFullServiceUrl(app.servicePaths.uploadDatabase),
            data: {
                username: app.user.name,
                password: app.user.password,
                table: tableName,
                json: json
            }
        });
    };         
    
    this.updateRecords = function(tableName, json) {
        return $.ajax({
            url: app.getFullServiceUrl(app.servicePaths.uploadRecords),
            data: {
                username: app.user.name,
                password: app.user.password,
                table: tableName,
                json: JSON.stringify(json).replace(/\'null\'/g, 'null')	// convert 'null' to null
            }
        });
    };
};