var ServiceHandler = function() {
    this.initialize = function() {
        $.ajaxSetup({
            type: 'POST',
            cache: false,
//            headers: {'cache-control': 'no-cache'},
            beforeSend: function() {
                var currentTime = new Date().getTime();                      
                this.url = this.url + '?currentTime=' + currentTime;
            }
        });
        
        // TODO: getFullServiceUrl function is unnecessary, We can integrate it to beforeSend function.
        downloadDatabaseService.initialize(app.getFullServiceUrl(app.servicePaths.downloadDatabase));               
        fileService.initialize(app.getFullServiceUrl(app.servicePaths.downloadFile));
        loginService.initialize(app.getFullServiceUrl(app.servicePaths.login));             
    };
};