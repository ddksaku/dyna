function LogHelper() {    
}

LogHelper.prototype = {
    history: new FifoFixedArray(50, []),
        
    log: function(className, functionName, text) {
        var message = '---' + className + '.' + functionName + '():- ' + text + '---';
        console.log(message); 
        this.history.push({time: dateHelper.convertDateTime(new Date()), level: 'log', message: message});
    },
    
    info: function(className, functionName, text) {
        var message = '---' + className + '.' + functionName + '():- ' + text + '---';
        console.info(message);  
        this.history.push({time: dateHelper.convertDateTime(new Date()), level: 'info', message: message});
    },
    
    warn: function(className, functionName, text) {
        var message = '---' + className + '.' + functionName + '():- ' + text + '---';
        console.warn(message);        
        this.history.push({time: dateHelper.convertDateTime(new Date()), level: 'warn', message: message});
    },
    
    error: function(className, functionName, text) {
        var message = '---' + className + '.' + functionName + '():- ' + text + '---';
        console.error();
        this.history.push({time: dateHelper.convertDateTime(new Date()), level: 'error', message: message});
    }
};