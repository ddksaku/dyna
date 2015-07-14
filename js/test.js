function testLoadStructure() {
    var s = {                        
        "record": "SELECT * FROM settings where id = 1111",                                               
        "projects": "SELECT * FROM project WHERE id = 3",
        "journal": "SELECT * FROM journal"
    };

    database.loadStructure(s,
        function(result) {
            console.log(result);
        }, 
        function() {
            console.error('error');
        });                        
}

function testBeep() {
    navigator.notification.beep(1000);
}

function testScanBarcode() {
    cordova.plugins.barcodeScanner.scan(
        function (result) {
            alert("We got a barcode\n" +                                        
                    "Result: " + result.text + "\n" +
                    "Format: " + result.format + "\n" +
                    "Cancelled: " + result.cancelled);
        }, 
        function (error) {
            alert("Scanning failed: " + error);
        }
    );
}

function testTakePhoto() {
    cameraHelper.takePhoto(
        function(photoUri) {
            cameraHelper.moveImage(photoUri);
        });
}

function testGetCurrentPosition() {                        
    geolocationHelper.getCurrentPosition(
        function(position) {
            alert('Latitude: ' + position.coords.latitude + '\n' +                                                       
                'Longitude: ' + position.coords.longitude + '\n' +
                'Altitude: ' + position.coords.altitude + '\n' +
                'Accuracy: ' + position.coords.accuracy + '\n' +
                'Altitude Accuracy: ' + position.coords.altitudeAccuracy + '\n' +
                'Heading: ' + position.coords.heading + '\n' +
                'Speed: ' + position.coords.speed + '\n' +
                'Timestamp: ' + position.timestamp + '\n');
        },
        function(error) {
            alert(error.code + ': ' + error.message);        
        });                        
}

function testWatchPosition() {                        
    var watchId = geolocationHelper.watchPosition(                                
        function(position) {
            alert('Latitude: ' + position.coords.latitude + '\n' +                                                       
                'Longitude: ' + position.coords.longitude + '\n');                                        
        },
        function(error) {
            alert(error.code + ': ' + error.message);        
        });   

    alert('Watch Id: ' + watchId);
}

function testProceedQueue() {        
    synchronize.addToQueue('project',
        {'id': '1', 'number': '1056', 'description': 'Johansen', 'location':	'Sandnes', 'fk_user': '5', 'updated': '2014-11-18 11:15:17'});        
    synchronize.proceedQueue();
}

function testDownloadFile() {
    var fileName = 'temp/st y le.css';
    
    synchronize.downloadForm(fileName);        
}

function testPdfOpen() {
    var filePath = encodeURI(fileHelper.rootDirectoryPath + app.localRootDirectory + 'temp/pdf.pdf');   
    
    window.plugins.fileOpener.open(filePath);
}

function testUploadFiles() {
     synchronize.uploadFiles();
    
//    fileHelper.getFileList(app.contentDirectory)
//        .done(
//            function(fileList) {
//                synchronize.uploadFiles(fileList);                                
//            });
}