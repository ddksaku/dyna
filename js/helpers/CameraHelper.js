function CameraHelper() {    
}

CameraHelper.prototype = {
    takePhoto: function(onSuccess, onError) {                      
        // take picture using device camera and retrieve image as base64-encoded string
        navigator.camera.getPicture(onSuccess, onError, {quality: 50, destinationType: Camera.DestinationType.FILE_URI});
    },        
    
    moveImage: function(imageUri) {    
        var functionName = 'moveImage';
        var self = this;
        var deferred = $.Deferred();
        
        window.resolveLocalFileSystemURL(imageUri,
            function(entry) {                        
                var time = new Date().getTime();                        
                var imageFileName = time + '.jpg';
                var imageFolder = app.contentDirectory;

                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
                    function(fileSystem) {      
                        // the folder is created if doesn't exist
                        fileSystem.root.getDirectory(imageFolder,
                            {create:true, exclusive: false},
                            function(directory) {
                                entry.moveTo(directory, imageFileName, 
                                    function(entry) {       
                                        logHelper.info('CameraHelper', functionName, 'Photo has been saved to ' + entry.toURL());                                
                                        deferred.resolve(imageFileName);
                                    }, 
                                    function(error) {
                                        self.onError(error);
                                        deferred.reject();
                                    });
                            },
                            function(error) {
                                self.onError(error);
                                deferred.reject();
                            });
                    },
                    function(error) {
                        self.onError(error);
                        deferred.reject();
                    });
            },
            function(error) {
                self.onError(error);
                deferred.reject();
            });
            
        return deferred.promise();
    },    
    
    onError: function(error) {
        logHelper.error('CameraHelper', 'onError', error.code + ': ' + error.message);               
    }
};
