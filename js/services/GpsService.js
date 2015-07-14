var GpsService = function() {
    this.put = function(url, key, latlng) {        
        return $.ajax({
            url: url,
            data: {
                username: app.user.name,
                password: app.user.password,
                user: key,
                latlng: latlng
            }
        });
    };         
};