var app = {
    isTestingMode: true, 
    className: 'app',
    serverAddress: '',    
    localRootDirectory: 'dynaForm/',
    remoteRootDirectory: '',
    contentDirectory: 'dynaForm/content/',
    uploadedContentDirectory: 'dynaForm/content/uploaded/',
    
    user: {},        
    
    tableNames: {
        settings: 'settings',
        user: 'user',
        gpsTrack: 'gps_track'
    },
    
    servicePaths: {
        login: 'login.php',
        downloadDatabase: 'info_get.php',
        downloadFile: 'files.php',
        uploadDatabase: 'info_put.php',        
        uploadFile: 'info_put_file.php',
        uploadRecords: 'info_put_record.php'        
    },        
    
    downloadedFilePaths: {
        logo: 'logo.png',
        style: 'style.css',
        main: {
            index: 'main/index.html'
        },
        sync: {
            index: 'sync/index.html'
        }
    },     
        
    localStorageKeys: {
        serverAddress: 'serverAddress',
        userName: 'userName',
        sync: { 
            lastDownloadedTableInfo: 'sync.download.tables',
            lastDownloadedFileInfo: 'sync.download.files',
            lastUploadedTableInfo: 'sync.upload.tables',
            lastUploadedFileInfo: 'sync.upload.files',            
            queue: 'sync.queue'
        }
    },
    
    routePaths: {
        login: 'login',       
        sync: 'sync'          
    },                
        
    getFullServiceUrl: function(servicePath) {               
        return 'http://' + this.serverAddress + '/' + servicePath;
    },
    
    showAlert: function (message, title) {
        if (navigator.notification) {
            navigator.notification.alert(message, null, title, 'OK');
        } else {
            alert(title ? (title + ': ' + message) : message);
        }
    },

    route: function() {             
        var functionName = 'route';
        
        router.addRoute('', function() {                          
            app.renderLoginPage();
        });        
                        
        router.addRoute(this.routePaths.sync, function() {     
            if (app.isTestingMode === true) {                
                $.mobile.changePage('#syncPage', {changeHash: false, transition: 'none'});
            } else {
                var filePath = app.localRootDirectory + app.downloadedFilePaths.sync.index;            
                fileHelper.isExists(filePath,
                    function() {                    
                        app.loadFile(app.downloadedFilePaths.sync.index);                        
                        logHelper.info(app.className, functionName, 'Sync page has been read from ' + filePath);                                       
                    },
                    function() {   
                        $.mobile.changePage('#syncPage', {changeHash: false, transition: 'none'});
                        logHelper.info(app.className, functionName, 'Sync page has been read from the app');                                        
                    });
            }                                    
        });                           
                        
        router.start();
    },
    
    initialize: function() {                
        this.serverAddress = localStorage.getItem(this.localStorageKeys.serverAddress);
        this.user.name = localStorage.getItem(this.localStorageKeys.userName);                                
        
        $('#serverAddress').val(app.serverAddress);
        $('#userName').val(app.user.name);
                    
        serviceHandler.initialize();                                        
        this.route();                                       
    },
    
    logIn: function() {
        var functionName = 'login';        
        event.preventDefault();
                
        app.showLoginProcess();

        app.serverAddress = $('#serverAddress').val();
        app.user.name = $('#userName').val();
        app.user.password = $.sha1($.md5($('#password').val()));
        app.remoteRootDirectory = 'http://' + app.serverAddress + '/files/';
        
        // save server address and user name for cookie        
        localStorage.setItem(app.localStorageKeys.serverAddress, app.serverAddress);
        localStorage.setItem(app.localStorageKeys.userName, app.user.name);        
                                               
        database.hasTable(app.tableNames.user)
            .then(
                function(result) {
                    if (result === true) { // user table exists
                        logHelper.info(app.className, functionName, 'Trying to log in via local database.');                     
                        app.loginViaLocalDatabase();                    
                    } else { // user table does not exist
                        logHelper.info(app.className, functionName, 'Trying to log in via web service.');                     
                        app.loginViaWebService();
                    }                
                },
                function() { // user table does not exist
                    logHelper.info(app.className, functionName, 'Trying to log in via web service.');   
                    app.loginViaWebService();
                });                       
    },
    
    loginViaWebService: function() {
        var loginServiceUrl = app.getFullServiceUrl(app.servicePaths.login);        
        loginService.initialize(loginServiceUrl);                               
        loginService.login(app.user.name, app.user.password)
            .then(
                function(data) {
                    app.hideLoginProcess();
                    
                    if (data.data.records === null) {                             
                        $('#loginErrorMessage').html('Invalid user name or password.');
                    } else { // logged in successfully 
                        $.each(data.data.records[0], function(key, value) {
                            app.user[key] = value;                            
                        });                                                
                        
                        serviceHandler.initialize(); // initialize all services, at this moment server address is updated.     
                        synchronize.setQueueTimer();
                        app.gotoNextPage();           
                    }
                },
                function() {
                    app.hideLoginProcess();
                    $('#loginErrorMessage').html('No response from server.');
                }
            );       
    },
    
    loginViaLocalDatabase: function() {
        var functionName = 'loginViaLocalDatabase';
        
        this.existsUser(app.user.name, app.user.password)
            .then(
                function(result) { // logged in successfully
                    app.hideLoginProcess();
                    
                    if (result !== null) { // logged in                                
                        $.each(result, function(key, value) {
                            app.user[key] = value;                            
                        });                        
                                                
                        serviceHandler.initialize(); // initialize all services, the server address is already set.
                        synchronize.setQueueTimer();
                        app.gotoNextPage();                                              
                    } else { 
                        $('#loginErrorMessage').html('Invalid user name or password.');
                    }
                },
                function() {
                    app.hideLoginProcess();                                                 
                    $('#loginErrorMessage').html('No response from database.');
                }
            ); 
    },
        
    existsUser: function(userName, password) {
        var functionName = 'existsUser';
        var deferred = $.Deferred();
                
        database.db.transaction(
            function(tx) {                                
                var query = 'SELECT * FROM ' + app.tableNames.user +
                    ' WHERE username = ? AND password = ?';
                tx.executeSql(query, [userName, password], 
                    function(tx, result) {                                        
                        deferred.resolve(result.rows.length > 0 ? result.rows.item(0) : null);
                    },
                    function(error) {
                        logHelper.error(app.className, functionName, error.message);                                                                       
                        deferred.reject(error.message);
                    });
            },
            function(error) {
                logHelper.error(app.className, functionName, error.message);                                                                       
                deferred.reject(error.message);
            }
        );

        return deferred.promise();
    },        
    
    gotoNextPage: function() {
        var functionName = 'gotoNextPage';
        
        if (app.isTestingMode === true) {            
            app.gotoSyncPage();                                    
        } else {                                   
            var mainPageFilePath = app.localRootDirectory + app.downloadedFilePaths.main.index;            
            fileHelper.isExists(mainPageFilePath,
                function() {
                    app.loadFile(app.downloadedFilePaths.main.index);                          
                },
                function(error) {
                    app.gotoSyncPage();                
                });
        }            
    },
    
    showLoginProcess: function() {
        $('#loginButton').hide();        
        loaderHelper.showLoader('Connecting to Server.', true, false);  
    },
    
    hideLoginProcess: function() {
        loaderHelper.hideLoader();
        $('#loginButton').show();
    },
    
    logOut: function() {
        if (window.confirm('Are you sure you want to quit?')) {                        
            navigator.app.exitApp();                   
        } 
    },
    
    renderLoginPage: function() {        
        var functionName = 'renderLoginPage';
        
        database.hasTable(this.tableNames.user)
            .done(
                function(result){                
                    if (result === true) {                        
                        $('#serverAddress').removeAttr('required');
                        $('#serverAddressField').hide();   
                    }
            });
            
        if (app.isTestingMode !== true) {
            fileHelper.setRootDirectoryPath();
            
            // load external css file
            fileHelper.read(app.localRootDirectory + app.downloadedFilePaths.style,
                    function(fileContent) {           
                        $('head').append('<style type="text/css">' + fileContent + '</style>');                
                        logHelper.info(app.className, functionName, 'Successfully loaded style.');                                    
                    },
                    function() {                
                        logHelper.error(app.className, functionName, 'Failed to load style.');                                    
                    });
        }                                                           
    },
    
    gotoSyncPage: function() {        
        router.load(app.routePaths.sync);
    },   
    
    loadFile: function(filePath) {        
        var functionName = 'loadFile';
        
        if (app.isTestingMode === true) {
            $.get('files/' + filePath, function(fileContent) {
                var body = '<div id="body" data-role="page" class="ui-page ui-page-theme-a ui-page-active">' + fileContent + '</div>';                        
                $('body').html(body);
                $.mobile.changePage('#body', {changeHash: false, transition: 'none'});
                logHelper.info(app.className, functionName, 'Loaded successfully ' + filePath);
            });                        
        } else {                   
            fileHelper.read(app.localRootDirectory + filePath,
                function(fileContent) {                                                    
                    var body = '<div id="body" data-role="page" class="ui-page ui-page-theme-a ui-page-active">' + fileContent + '</div>';                        
                    $('body').html(body);
                    $.mobile.changePage('#body', {changeHash: false, transition: 'none'});
                    logHelper.info(app.className, functionName, 'Loaded successfully ' + filePath);                                    
                },
                function() {                
                    logHelper.error(app.className, functionName, 'Failed to load ' + filePath);                                    
                });
        }
    },
    
    takePhoto: function() {
        var deferred = $.Deferred();
        
        cameraHelper.takePhoto(
            function(imageUri) {         
                cameraHelper.moveImage(imageUri)
                    .done(
                        function(photoName) {                            
                            deferred.resolve(photoName);
                        });
            },
            function() {
                deferred.reject();
            });
            
        return deferred.promise();
    },
    
    getPhotoPath: function(photoName) {
        if (photoName && photoName != 'undefined') {
            return fileHelper.rootDirectoryPath + this.contentDirectory + '/' + photoName;            
        }               
        
        return '';                
    },
    
    reportGPSToRemote: function(key, duration, url) {
        var functionName = 'reportGPSToRemote';
        
        window.setInterval(function() {            
            geolocationHelper.getCurrentPosition(
                function(position) {
                    var latlng = position.coords.latitude + ',' + position.coords.longitude;
                    gpsService.put(url, key, latlng).then(
                        function(data) {
                            try {                                
                                if (data.status == responseStatus.SUCCESS) {
                                    logHelper.info(app.className, functionName, 'Successfully reported current location ' + latlng + ' to server.');
                                } else {
                                    logHelper.error(app.className, functionName, 'Failed to report current location ' + latlng + ' to server.');
                                }
                            } catch(ex) {
                                logHelper.error(app.className, functionName, 'Failed to report current location ' + latlng + ' to server.');
                            }
                        },
                        function(error) {
                            logHelper.error(app.className, functionName, 'Failed to report current location ' + latlng + ' to server.');
                        });
                },
                function(error) {
                    logHelper.error(app.className, functionName, 'Failed to track current position.');                                    
                });
        }, 1000 * duration);                 
    },
    
    reportGPSToLocal: function(duration) {
        var functionName = 'reportGPSToLocal';
        
        window.setInterval(function() {            
            geolocationHelper.getCurrentPosition(
                function(position) {
                    var latlng = position.coords.latitude + ',' + position.coords.longitude;                  
                    database.db.transaction(
                        function(tx) {                                
                            var query = 'INSERT INTO ' + app.tableNames.gpsTrack + '(fk_user, lat_long, date_time, updated) VALUES (?, ?, ?, ?)'; 
                            var dateTime = dateHelper.convertDateTime(new Date());                            
                            tx.executeSql(query, [app.user.id, latlng, dateTime, dateTime], 
                                function(tx, result) {                                           
                                    synchronize.addToQueue(app.tableNames.gpsTrack,
                                        {                                            
                                            'fk_user': app.user.id,                                             
                                            'lat_long': latlng, 
                                            'date_time': dateTime
                                        });        
                                    synchronize.proceedQueue();
                                },
                                function(error) {
                                    logHelper.error(app.className, functionName, error);                                                                                                           
                                });
                        },
                        function(error) {
                            logHelper.error(app.className, functionName, error);                                                                                                   
                        }
                    );                    
                },
                function(error) {
                    logHelper.error(app.className, functionName, 'Failed to track current position.');                                    
                });
        }, 1000 * duration); 
    },
    
    getGuid: function(){
        var tmp = (Math.floor((new Date().getTime()) / 1000) - 1417509900).toString(36);    // 1417509900 is on December 2nd, 2014
        if (tmp.length < 6) {
            tmp = ('000000' + tmp).substr(-6);
        }
        
        return (app.user.id.toString(36) + tmp).toUpperCase();
    }
};

// services
var serviceHandler = new ServiceHandler();
var downloadDatabaseService = new DownloadDatabaseService();
var uploadDatabaseService = new UploadDatabaseService();
var fileService = new FileService();
var loginService = new LoginService();
var gpsService = new GpsService();

// helpers
var fileHelper = new FileHelper();        
var loaderHelper = new LoaderHelper();
var logHelper = new LogHelper();
var connectionHelper = new ConnectionHelper();
var dateHelper = new DateHelper();
var cameraHelper = new CameraHelper();
var geolocationHelper = new GeolocationHelper();
var uuidHelper = new UuidHelper();

// objects
var database = new Database();
var synchronize = new Synchronize();
var localStorage = window.localStorage;

// add event handler
$(document).ready(function() {
    document.addEventListener('deviceready', onDeviceReady, false);          
});

function onDeviceReady() {   
    document.addEventListener('menubutton',
        function() {                       
            if ($('#buttonMenu').length) {
                $('#buttonMenu').click();
            }            
        }, false);
        
    document.addEventListener('backbutton',
        function() {            
            try {
                if ($('#buttonMain').length) {                
                    $('#buttonMain').click();
                } else {
                    app.logOut();
                }
            } catch (e) {                
                app.logOut();
            }            
        }, false);   
        
    if (app.isTestingMode !== true) {
        app.initialize();        
    }
};
           
if (app.isTestingMode === true) {           
    // initialize the app           
    app.initialize();    
}