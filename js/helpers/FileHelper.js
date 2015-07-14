function FileHelper() {     
}

FileHelper.prototype = {	
    className: 'FileHelper',

    getFileName: function(filePath) {
        var paths = filePath.split('/');
        return paths[paths.length - 1];
    },
    
    getLastDirectoryPath: function(filePath) {
        var fileName = this.getFileName(filePath);
        var directoryPath = filePath.replace(fileName, '');
        directoryPath = directoryPath.replace(/\/$/g, ''); // remove last /        
        directoryPath = directoryPath.replace(/^\//g, ''); // remove first /
        
        return directoryPath;
    },
    
    createDirectory: function(root, path, success) {
        var self = this;
        var functionName = 'createDirectory';
        var dirs = path.split('/').reverse();        

        var createDir = function(dir) {
            logHelper.info(self.className, functionName, 'create dir ' + dir);
            root.getDirectory(dir, {
                create : true,
                exclusive : false
            }, successCB, failCB);
        };

        var successCB = function(entry) {
            logHelper.info(self.className, functionName, 'dir created ' + entry.fullPath);
            root = entry;
            if(dirs.length > 0){
                createDir(dirs.pop());
            } else {
                logHelper.info(self.className, functionName, 'all dir created');
                success(entry);
            }
        };

        var failCB = function() {
            logHelper.error(self.className, functionName, 'failed to create dir ' + dir);
        };

        createDir(dirs.pop());
    },

    getLastDirectorySystem: function(rootFileSystem, filePath) {  
        var self = this;
        var functionName = 'getLastDirectorySystem';
        var deferred = $.Deferred();
        
        var directoryPath = this.getLastDirectoryPath(filePath);        
        if (directoryPath === null || directoryPath === undefined || directoryPath === '') {
            deferred.resolve(rootFileSystem);
        } else {                                   
            this.createDirectory(rootFileSystem, directoryPath,           
                function(directorySystem) {
                    logHelper.info(self.className, functionName, 'Created successfully directory at ' + directoryPath + '.');           
                    deferred.resolve(directorySystem);
                },
                function() {           
                    logHelper.error(self.className, functionName, 'Failed to create directory at ' + directoryPath + '.');
                    deferred.reject();
                });
        }
        
        return deferred.promise();
    },
        
    getRootDirectoryPath: function() {
        var deferred = $.Deferred();
        
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
            function(fileSystem) {                
                deferred.resolve(fileSystem.root.toNativeURL());                
            },
            function() {
                deferred.reject();
            });        
        
        return deferred.promise();
    },
    
    setRootDirectoryPath: function() {        
        this.getRootDirectoryPath()
            .then(
                function(rootDirectoryPath) {                                        
                    FileHelper.prototype.rootDirectoryPath = rootDirectoryPath;
                },
                function() {                             
                    FileHelper.prototype.rootDirectoryPath = null;
                });
    },
    
    download: function(remoteFilePath, localFilePath, onSuccess, onError) {
        var self = this;
        
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
            function(fileSystem) {                
                self.getLastDirectorySystem(fileSystem.root, localFilePath)
                    .done(
                        function(directorySystem) {
                            var fileName = self.getFileName(localFilePath);
                            var options = {
                                create: true,
                                exclusive: false
                            }; 
                            directorySystem.getFile(fileName, options,
                                function(fileEntry) {
                                    localFilePath = fileEntry.toNativeURL();                                    
                                    var fileTransfer = new FileTransfer();
                                    fileTransfer.download(remoteFilePath, localFilePath, 
                                        function() {                                        
                                            var message = 'Successfully downloaded ' + remoteFilePath + ' to ' + localFilePath + '.';
                                            onSuccess.call(self, message);
                                        }, 
                                        function(error) {
                                            error.message = 'Failed to download ' + remoteFilePath + ' to ' + localFilePath + '.';
                                            onError.call(self, error);
                                        });
                                },
                                function (error) {
                                    error.message = 'Failed to get file.';
                                    onError.call(self, error);
                                });
                        }); 
            },
            function(error) {
                error.message = 'Request file system failed.';
                onError.call(self, error);
            });   
    },
    
    isExists: function(filePath, onSuccess, onError) {
        var self = this;
        
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0,
            function(fileSystem) {                           
                self.getLastDirectorySystem(fileSystem.root, filePath)
                    .done(
                        function(directorySystem) {
                            var fileName = self.getFileName(filePath);
                            directorySystem.getFile(fileName, {create: false},
                                function(fileEntry) {                                    
                                    onSuccess.call(self);                                    
                                },
                                function (error) {
                                    error.message = filePath + ' does not exist.';
                                    onError.call(self, error);
                                });
                        });
            },
            function(error) {
                error.message = 'Request file system failed.';
                onError.call(self, error);
            });
    },
    
    write: function(filePath, text, onSuccess, onError) {
        var self = this;                                                    
                            
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0,
            function(fileSystem) {                           
                self.createFile.call(self, fileSystem, filePath, text, onSuccess, onError);
            },
            function(error) {
                error.message = 'Request file system failed.';
                onError.call(self, error);
            });       
    },        
    
    createFile: function(fileSystem, filePath, text, onSuccess, onError) { 
        var self = this;
                                                               
        var fileName = this.getFileName(filePath);
        var options = {
            create: true,
            exclusive: false
        }; 
        
        this.getLastDirectorySystem(fileSystem.root, filePath)
            .done(
                function(directorySystem) {
                    directorySystem.getFile(fileName, options,
                        function(fileEntry) {
                            self.createFileWriter.call(self, fileEntry, text, onSuccess, onError);
                        },
                        function (error) {
                            error.message = 'Failed creating file.';
                            onError.call(self, error);
                        });
                });                
    },

    createFileWriter: function(fileEntry, text, onSuccess, onError) {
        var self = this;
        
        fileEntry.createWriter(
            function(fileWriter) {
//                var len = fileWriter.length;
//                fileWriter.seek(len);
//                fileWriter.write(text + '\n');
                fileWriter.write(text);
                var message = 'Wrote: ' + text;
                onSuccess.call(self, message);
            },
            function(error) {
                error.message = 'Unable to create file writer.';
                onError.call(self, error);
            });
    },
    
    read: function(filePath, onSuccess, onError) {        
        var self = this;

        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
            function(fileSystem) {
                self.getFileEntry.call(self, fileSystem, filePath, onSuccess, onError);
            },
            function(error) {
                error.message = 'Unable to request file system.';
                onError.call(self, error);
            });
    },
    
    getFileEntry: function(fileSystem, filePath, onSuccess, onError) {
        var self = this;
                
        var fileName = this.getFileName(filePath);    
        this.getLastDirectorySystem(fileSystem.root, filePath)
            .done(
                function(directorySystem) {
                    // Get existing file, don't create a new one.
                    directorySystem.getFile(fileName, null,
                        function(fileEntry) {
                            self.getFile.call(self, fileEntry, onSuccess, onError);
                        }, 
                        function(error) {
                            error.message = 'Unable to get file entry for reading.';
                            onError.call(self, error);
                        });
                });
    },

    getFile: function(fileEntry, onSuccess, onError) { 
        var self = this; 
        
        fileEntry.file(
            function(file) { 
                self.getFileReader.call(self, file, onSuccess);
            },
            function(error) {
                error.message = 'Unable to get file for reading.';
                onError.call(self, error);
            });
    },

    getFileReader: function(file, onSuccess) {
        var self = this;
        
        var reader = new FileReader();
        reader.onloadend = function(evt) { 
            var textToWrite = evt.target.result;
            onSuccess.call(self, textToWrite);
        };

        reader.readAsText(file);
    },
   
    deleteFile: function(filePath, onSuccess, onError) {
        var self = this;

        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
            function(fileSystem) {
                self.getFileEntryForDelete.call(self, fileSystem, filePath, onSuccess, onError);
            }, 
            function(error) {
                error.message = 'Unable to retrieve file system.';
                onError.call(self, error);
            });
    }, 
    
    getFileEntryForDelete: function(fileSystem, filePath, onSuccess, onError) { 
        var self = this;
                
        var fileName = this.getFileName(filePath);    
        this.getLastDirectorySystem(fileSystem.root, filePath)
            .done(
                function(directorySystem) {
                    directorySystem.getFile(fileName, null, 
                        function(fileEntry) {
                            self.removeFile.call(self, fileEntry, onSuccess, onError);
                        },
                        function(error) {
                            error.message = 'Unable to find the file.';
                            onError.call(self, error);
                        });
                });
    },
    
    removeFile: function(fileEntry, onSuccess, onError) {
        var self = this;
        
        fileEntry.remove(
            function(entry) {
                var message = 'File removed.';
                onSuccess.call(self, message);
            }, 
            function(error) {
                error.message = 'Unable to remove the file.';
                onError.call(self, error);
            });
    },
    
    getFileList: function(path) {
        var self = this;     
        var functionName = 'getFileList';
        var deferred = $.Deferred();
               
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
            function(fileSystem) {            
                fileSystem.root.getDirectory(path, {create: true, exclusive: false}, 
                    function(directory) {                        
                        var directoryReader = directory.createReader();
                        directoryReader.readEntries(
                            function(entries) {
                                var fileList = [];
                                for (var index = 0; index < entries.length; index++) {
                                    if (entries[index].isFile === true) {                                                  
                                        fileList.push(self.rootDirectoryPath + entries[index].fullPath.substr(1));                      
                                    } else if (entries[index].isDirectory === true) {                                
                                    }
                                }
                                
                                deferred.resolve(fileList);                                            
                            }, 
                            function(error) {
                                logHelper.error(self.className, functionName, 'Reading directory system failed - ' + error.code + '.');                                       
                                deferred.reject();
                            });                             
                });
        }, 
        function(error) {
            logHelper.error(self.className, functionName, 'Request file system failed - ' + error.code + '.');   
            deferred.reject();
        });
        
        return deferred.promise();
    },
    
    moveFile: function(sourceFile, targetFile, onSuccess, onFail) {      
        var self = this;
        
        var fileName = this.getFileName(targetFile);    
        var directoryPath = this.getLastDirectoryPath(targetFile);
        directoryPath = directoryPath.replace(this.rootDirectoryPath, '');
        
        window.resolveLocalFileSystemURL(sourceFile, 
            function(source) {
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
                    function(fileSystem) {      
                        // the folder is created if doesn't exist
                        fileSystem.root.getDirectory(directoryPath,
                            {create:true, exclusive: false},
                            function(destination) {
                                source.moveTo(destination, fileName, onSuccess, onFail);
                            },
                            self.fail);                      
                    }, 
                    self.fail);
            }, 
            self.fail);        
    },
    
    fail: function(error) {
        logHelper.error(this.className, 'fail', 'Code = ' + error.code + ', Message = ' + error.message);   
    },
    
    getLastModificationTime: function(filePath) {
        var deferred = $.Deferred();
        
        window.resolveLocalFileSystemURL(filePath,
            function(entry) {
                entry.getMetadata(
                    function(meta) {                  
                        deferred.resolve(meta.modificationTime);                                               
                    },
                    self.fail);
            },
            self.fail);          
            
        return deferred.promise();
    }
};

