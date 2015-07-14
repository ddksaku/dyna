function DateHelper() {    
}

DateHelper.prototype = {
    now: function() {
        return new Date().toISOString().substr(0, 16).replace('T',' ');
    },
    
    getTwoDecimal: function(value) {
        if (value.length < 2 || value < 10) {
            return '0' + value;
        }
        
        return value;
    },
    
    convertDateTime: function(date) {        
        return date.getFullYear() + "-"
            + this.getTwoDecimal(date.getMonth() + 1) + "-" 
            + this.getTwoDecimal(date.getDate()) + " "  
            + this.getTwoDecimal(date.getHours()) + ":"  
            + this.getTwoDecimal(date.getMinutes()) + ":" 
            + this.getTwoDecimal(date.getSeconds());
    },
    
    daysBetween: function(date1, date2) {
        var oneDay = 1000 * 60 * 60 * 24;
        var difference = date1.getTime() - date2.getTime();
        
        return Math.round(difference / oneDay);
    },
    
    addDays: function(date, days) {
        date.setDate(date.getDate() + days);
        return this.convertDateTime(date);
    }
};