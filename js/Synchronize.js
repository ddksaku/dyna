var Synchronize = function() {    
    var self;
    var className;          
    
    var isDownloadingTables = false;
    var isUploadingTables = false;
    var isDownloadingFiles = false;
    var isUploadingFiles = false;
    
    this.initialize = function() {
        self = this;
        className = 'Synchronize';               
    };        
    
    this.downloadTables = function() {
        var functionName = 'downloaTables';
        
        if (isDownloadingTables === true) {
            return;
        } else {
            isDownloadingTables = true;
        }
        
//        if(connectionHelper.checkConnection() === false) {
//            app.showAlert('No network connection.');
//            return;
//        }
                        
        downloadDatabaseService.getAllTables()
            .then(                
                function(data) {                              
                    $('#downloadSettingsStatusMessage').text('Downlading table settings...'); 
                    
                    var tableList = data.data.records;
                    if (tableList === null) {
                        logHelper.info(className, functionName, 'There are no tables available.');                        
                    } else {                        
                        var totalTableCount = tableList.length;                        
                        var downloadedTableCount = 0;
                                    
                        $.each(tableList, function(index, table) {                            
                            self.downloadTable(table.TABLE_NAME)
                                .always(
                                    function() {                  
                                        $('#downloadSettingsStatusMessage').text('Downladed ' + table.TABLE_NAME + ' table.');                                        
                                        downloadedTableCount++;
                                        if (downloadedTableCount === totalTableCount) {                                                                                                     
                                            self.updateLastDownloadTablesInfo();
                                        }
                                    });
                        });                      
                    }
                },
                function() {
                    logHelper.error(className, functionName, 'The web service is offline.');
                }
            );
    };      
    
    this.downloadTable = function(tableName) {        
        var functionName = 'downloadTable';
        
        var deferred = $.Deferred();  
        var timeStampKey = tableName + '.timeStamp'; 
        var lastUpdated = localStorage.getItem(timeStampKey);
        if (lastUpdated === null || lastUpdated === undefined) {
            lastUpdated = '';
        }                     
        downloadDatabaseService.getTable(tableName, lastUpdated)
            .then(
                function(data) {                                            
                    var tableColumns = database.convertColumns(data.design);          
                    var tableRecords = data.data.records;
                    var timeStamp = data.timestamp;
                                        
                    if (tableColumns !== null) {
                        database.createTable(tableName, tableColumns)
                            .then(
                                function() {
                                    if (tableRecords !== null) {
                                        logHelper.info(className, functionName, tableRecords);
                                        self.updateTableRecords(tableName, tableColumns, tableRecords)
                                            .always(
                                                function(result) {
                                                    localStorage.setItem(timeStampKey, timeStamp);                    
                                                    
                                                    var message = result.success + ' of ' + result.all +
                                                        ' records from ' + tableName + ' table updated.';
                                                    logHelper.info(className, functionName, message);                                                           
                                                    deferred.resolve();
                                                });                                            
                                    } else {
                                        deferred.resolve();
                                    }
                                },
                                function(error) {
                                    deferred.reject();
                                });                                   
                    }                                              
                },
                function() {
                    logHelper.error(className, functionName, 'The web service is offline.');  
                    deferred.reject();
                }
            );
    
        return deferred.promise(); 
    }; 
    
    this.updateLastDownloadTablesInfo = function() {        
        var lastUpdated = dateHelper.now();
        $('#downloadSettingsStatusMessage').text(lastUpdated);
        localStorage.setItem(app.localStorageKeys.sync.lastDownloadedTableInfo, lastUpdated);        
        isDownloadingTables = false;        
        $('#downloadFilesButton').removeClass('ui-disabled');
    };
    
    this.uploadTables = function() {
        var functionName = 'uploadTables';

        if (isUploadingTables === true) {
            return;
        } else {
            isUploadingTables = true;
        }
        
//        if(connectionHelper.checkConnection() === false) {
//            app.showAlert('No network connection.');
//            return;
//        }
        
        database.getTableList()
            .done(
                function(tableNames) {                    
                    if (tableNames.length === 0) {
                        logHelper.info(className, functionName, 'There is no table to upload.');                        
                    } else {                   
                        $('#uploadInformationStatusMessage').text('Uploading table settings...'); 
                        
                        var totalTableCount = tableNames.length;
                        var uploadedTableCount = 0;
                        
                        $.each(tableNames, function(index, tableName) {
                            // when uploading the information, do not upload the settings or users table
                            if (tableName === app.tableNames.user || tableName === app.tableNames.settings) {
                                uploadedTableCount++;
                                if (uploadedTableCount === totalTableCount) {
                                    self.updateLastUploadedTablesInfo();                      
                                }
                            } else {
                                self.uploadTable(tableName)
                                    .always(
                                        function() {
                                            $('#uploadInformationStatusMessage').text('Uploaded ' + tableName + ' table.');                                        
                                            uploadedTableCount++;                                             
                                            if (uploadedTableCount === totalTableCount) {
                                                self.updateLastUploadedTablesInfo();                                           
                                            }                                                                                    
                                        });
                            }                           
                        });
                    }
                }                
            );            
    };
    
    this.uploadTable = function(tableName) {
        var functionName = 'uploadTable';        
        
        var deferred = $.Deferred();  
        this.getTableRecords(tableName)
            .then(
                function(records) {
                    var recordCount = records.length;
                    if (recordCount > 0) {
                        var columns = null; // in this version We assume local and remote databases will contain same tables.
                        
                        // We will send request by limited count of records, otherwise long request will occur problems
                        var MAX_RECORD_COUNT_PER_REQUEST = 50;
                        var startRecordIndex = 0;
                        var endRecordIndex = 0;                        
                        
                        var totalSubUpdateCount = 0;
                        var subUpdatedCount = 0;
                        while (startRecordIndex < recordCount) {                         
                            endRecordIndex = startRecordIndex + MAX_RECORD_COUNT_PER_REQUEST;
                            if (endRecordIndex > recordCount) {
                                endRecordIndex = recordCount;
                            }
                            
                            totalSubUpdateCount++;
                            uploadDatabaseService.updateTable(tableName, columns, records.slice(startRecordIndex, endRecordIndex))
                                .then(
                                    function(data) {            
                                        subUpdatedCount++;                                        
                                        if (subUpdatedCount === totalSubUpdateCount) {
                                            deferred.resolve();
                                        }
                                        
                                        var updatedRecordCount = data.data.count;                                    
                                        if (updatedRecordCount === null ||
                                            updatedRecordCount === undefined ||
                                            updatedRecordCount === 0) {           
                                            logHelper.warn(className, functionName, 'No record updated to ' + tableName);
                                        } else {
                                            var message = updatedRecordCount + ' record(s) updated to ' + tableName;
                                            logHelper.info(className, functionName, message);                                                                                                                                                                                                                      
                                        }                                                 
                                    },
                                    function() {
                                        subUpdatedCount++;                                        
                                        if (subUpdatedCount === totalSubUpdateCount) {
                                            deferred.reject();
                                        }
                                        
                                        logHelper.error(className, functionName, 'The web service is offline.');                    
                                    }
                                );
                            
                            startRecordIndex = endRecordIndex;
                        }
                    } else {
                        deferred.reject();
                        logHelper.info(className, functionName, tableName + ' contains no records.');                    
                    }                    
                },
                function(error) {
                    deferred.reject();
                });     
                
        return deferred.promise();
    };     
    
    this.updateLastUploadedTablesInfo = function() {        
        var lastUpdated = dateHelper.now();
        $('#uploadInformationStatusMessage').text(lastUpdated);
        localStorage.setItem(app.localStorageKeys.sync.lastUploadedTableInfo, lastUpdated);        
        isUploadingTables = false;
    };
            
    this.downloadForms = function() {
        var functionName = 'downloadForms';       
        
        if (isDownloadingFiles === true) {
            return;
        } else {
            isDownloadingFiles = true;
        }
                        
//        if(connectionHelper.checkConnection() === false) {
//            app.showAlert('No network connection.');
//            return;
//        }                    

        fileService.getAllFiles()
            .then(
                function(data) {                                          
                    var fileList = data.data.records;
                    if (fileList === null) {
                        logHelper.info(className, functionName, 'There is no any files.');                        
                    } else { 
                        $('#downloadFilesStatusMessage').text('Downlading forms...');

                        var totalFileCount = fileList.length;
                        var downloadedFileCount = 0;

                        $.each(fileList, function(index, file) {     
                            var filePath = file[0];
                            self.downloadForm(filePath)
                                .always(
                                    function() {
                                        $('#downloadFilesStatusMessage').text('Downloaded ' + filePath + '.');                                        
                                        downloadedFileCount++;
                                        if (downloadedFileCount === totalFileCount) {
                                            self.updateLastDownloadFilesInfo();
                                        }
                                    });                            
                        });                                                                                 
                    }
                },
                function() {
                    logHelper.error(className, functionName, 'The web service is offline.');
                }
            );                                                           
    };
    
    this.downloadForm = function(filePath) {
        var functionName = 'downloadForm';
                
        var deferred = $.Deferred();                
        if (filePath.slice(-1) === '/') { // it's directory    
            deferred.reject("It's directory.");
        } else { // it's file
            var remoteFilePath = encodeURI(app.remoteRootDirectory + filePath);             
            var localFilePath = encodeURI(app.localRootDirectory + filePath);                        
            
            fileHelper.download(remoteFilePath, localFilePath,
                function(message) {                                        
                    logHelper.info(className, functionName, message);     
                    deferred.resolve();
                },
                function(error) {                   
                    logHelper.error(className, functionName, error.message);  
                    deferred.resolve(error.message);
                });
        }
        
        return deferred.promise();
    };
    
    this.updateLastDownloadFilesInfo = function() {        
        var lastUpdated = dateHelper.now();
        $('#downloadFilesStatusMessage').text(lastUpdated);
        localStorage.setItem(app.localStorageKeys.sync.lastDownloadedFileInfo, lastUpdated);        
        isDownloadingFiles = false;
        $('#continueButton').show();
    };  
    
    this.getTableRecords = function(tableName) {
        var functionName = 'getTableRecords';
        var deferred = $.Deferred();
        
        database.db.transaction(
            function(tx) {                                
                var query = 'SELECT * FROM ' + tableName;
                tx.executeSql(query, [],
                    function(tx, result) {                      
                        var records = [];                          
                        for (index = 0; index < result.rows.length; index++) {                                                     
                            records.push(result.rows.item(index));                                                        
                        }

                        deferred.resolve(records);
                    });
            },
            function(error) {
                logHelper.error(className, functionName, error.message);                                                                       
                deferred.reject(error.message);
            }
        );

        return deferred.promise();
    };
    
    this.updateTableRecords = function (tableName, tableColumns, tableRecords) {
        var functionName = 'updateTableRecords';
        var deferred = $.Deferred();
        
        var updateRowCountInSuccess = 0;
        database.db.transaction(
            function(tx) {
                var keys = [],
                    valueParameters = [];                    
                $.each(tableColumns, function(index, column) {
                    keys.push('`' + column.name + '`'); 
                    valueParameters.push('?');
                });
                keys = keys.join(',');    
                valueParameters = valueParameters.join(',');
                
                var query = 'INSERT OR REPLACE INTO ' + tableName +
                        '(' + keys + ') VALUES (' + valueParameters + ')';                
        
                $.each(tableRecords, function(index, record) {
                    var values = [];
                    $.each(tableColumns, function(index, column) {
                        var value = record[column.name];                        
                        values.push(value);                                           
                    });
                    
                    logHelper.info(className, functionName, query + ' - ' + values.join(','));
                    tx.executeSql(query, values,
                        function() {
                            logHelper.info(className, functionName, query + ' - ' + values.join(',') + ' successfully updated into ' + tableName); 
                            updateRowCountInSuccess = updateRowCountInSuccess + 1;
                        },
                        function(error) {
                            logHelper.error(className, functionName, query + ' - ' + values.join(','));
//                            logHelper.error(className, functionName, error.code); 
                        });
                });
            }, 
            function(error) {
                logHelper.error(className, functionName, error.message);                
                deferred.reject(error.message);
            },
            function() {                                
                deferred.resolve({
                    'success': updateRowCountInSuccess,
                    'all': tableRecords.length
                });
            });                        
            
            return deferred.promise();
    };
    
    this.updateLastUploadFilesInfo = function() {        
        var lastUpdated = dateHelper.now();
        $('#uploadFilesStatusMessage').text(lastUpdated);
        localStorage.setItem(app.localStorageKeys.sync.lastUploadedFileInfo, lastUpdated);        
        isUploadingFiles = false;  
        
        fileHelper.getFileList(app.uploadedContentDirectory)
            .done(
                function(fileList) {                    
                    self.deleteOldFiles(fileList, 30); // delete one month old files
                });        
    };
    
    this.uploadFiles = function(fileList) {        
        if (typeof fileList.length == 'undefined') {                        
            fileHelper.getFileList(app.contentDirectory)
                .done(
                    function(files) {                        
                        self.uploadFiles(files);                                                                
                    });
        } else {                   
            if (fileList.length === 0) {
                return;
            }
            
            if (isUploadingFiles === true) {
                return;
            } else {
                isUploadingFiles = true;
            }

//            if(connectionHelper.checkConnection() === false) {
//                app.showAlert('No network connection.');
//                return;
//            }

            $('#uploadFilesStatusMessage').text('Uploading files...');

            var totalFileCount = fileList.length;
            var uploadedFileCount = 0;
            $.each(fileList, function(index, file) {            
                self.uploadFile(file)
                    .then(
                        function() {
                            $('#uploadFilesStatusMessage').text('Uploaded ' + file + '.');                                        
                            uploadedFileCount++;
                            if (uploadedFileCount === totalFileCount) {
                                self.updateLastUploadFilesInfo();
                            }
                        },
                        function() {
                            $('#uploadFilesStatusMessage').text('Failed to upload ' + file + '.');                                        
                            uploadedFileCount++;
                            if (uploadedFileCount === totalFileCount) {
                                self.updateLastUploadFilesInfo();
                            }
                        });
            });
        }                        
    };   
    
    this.uploadFile = function(filePath, moveUploadedFile) { 
        var functionName = 'uploadFile';
        var deferred = $.Deferred();
        
        var options = new FileUploadOptions();
        options.fileKey = 'file';
        options.fileName = filePath.substr(filePath.lastIndexOf('/') + 1);        
//        options.mimeType = 'image/jpeg';       
        options.chunkedMode = false;

        new FileTransfer().upload(filePath, 
            'http://' + app.serverAddress + '/' + app.servicePaths.uploadFile + '?username=' + app.user.name + '&password=' + app.user.password,
            function(response) {               
                logHelper.info(className, functionName, 'Code = ' + response.responseCode);
                logHelper.info(className, functionName, 'Response = ' + response.response);
                logHelper.info(className, functionName, 'Sent = ' + response.bytesSent);
                
                var data = JSON.parse(response.response);
                if (data.status == responseStatus.SUCCESS) {     
                    if (moveUploadedFile === false) {
                        deferred.resolve();
                    } else {
                        var moveFilePath = filePath.replace(app.contentDirectory, app.uploadedContentDirectory);
                        fileHelper.moveFile(filePath, moveFilePath,
                            function(entry) {
                                logHelper.info(className, functionName, 'File has been moved to ' + entry.toURL());                               
                                deferred.resolve();
                            },
                            function(error) {
                                logHelper.error(className, functionName, error.message);
                                deferred.resolve();
                            });
                    }
                                                            
                } else {
                    deferred.reject();
                }                                                 
            },
            function(error) {
                logHelper.error(className, functionName, 'An error has occurred: Code = ' + error.code);
                logHelper.error(className, functionName, 'upload error source ' + error.source);
                logHelper.error(className, functionName, 'upload error target ' + error.target);
                
                deferred.reject();
            },
            options);
            
        return deferred.promise();
    };
    
    this.deleteOldFiles = function(fileList, days) {
        var functionName = 'deleteOldFiles';
        
        $.each(fileList, function(index, file) {            
            fileHelper.getLastModificationTime(file)
                .done(
                    function(date) {                            
                        if (dateHelper.daysBetween(new Date(), new Date(date)) > days) {  
                            file = file.replace(fileHelper.rootDirectoryPath, '');
                            fileHelper.deleteFile(file,
                                function() {
                                    logHelper.info(className, functionName, 'Deleted ' + file + '.');
                                },
                                function(error) {
                                    logHelper.error(className, functionName, error);
                                });
                        }                                 
                    });
        });
    };
    
    this.setQueueTimer = function() {
        var functionName = 'setQueueTimer';                
                
        database.db.transaction(
            function(tx) {
                var query = 'SELECT value FROM ' + app.tableNames.settings + 
                    ' WHERE key = "sync.upload.time"';
                tx.executeSql(query, [],
                    function(tx, result) {
                        if (result.rows !== undefined && result.rows.length > 0) {
                            var syncUploadTime = result.rows.item(0).value;
                            
                            if (syncUploadTime !== null && syncUploadTime > 30) { // timer should run at least after 30 seconds
                                window.setInterval(function() {            
                                    self.proceedQueue();
                                }, 1000 * syncUploadTime); 
                                logHelper.info(className, functionName, 'Set ' + syncUploadTime + ' seconds interval for a timer.');                               
                            }
                        }
                    });                    
            },
            function(error) {
                logHelper.error(className, functionName, error.message);                                
            }
        );                        
    };
    
    this.proceedQueue = function() {
        var functionName = 'proceedQueue';
        
        if (connectionHelper.checkConnection() === true) {
            var queue = JSON.parse(localStorage.getItem(app.localStorageKeys.sync.queue));             
            if (queue !== null && queue.length > 0) {
                $.each(queue, function(index, item) {
                    uploadDatabaseService.updateRecords(item.tableName, item.records)
                        .then(
                            function(data) {                                
                                if (data.status == responseStatus.SUCCESS) {
                                    logHelper.info(className, functionName, JSON.stringify(item) + ' has been uploaded to server.'); 
                                    queue.pop(item);
                                    localStorage.setItem(app.localStorageKeys.sync.queue, JSON.stringify(queue));                                    
                                } else {
                                    logHelper.error(className, functionName, data.message); 
                                }
                            },
                            function() {
                                logHelper.error(className, functionName, 'The web service is offline.'); 
                            });
                });
            }
        }
    };
    
    this.addToQueue = function(tableName, records) {
        var queue = JSON.parse(localStorage.getItem(app.localStorageKeys.sync.queue));
        if (queue === null) {
            queue = [];        
        }  
        
        if (tableName && records) {
            queue.push({
                'tableName': tableName,
                'records': records
            });
        }
        
        localStorage.setItem(app.localStorageKeys.sync.queue, JSON.stringify(queue));      
    };
    
    this.initialize();
};
