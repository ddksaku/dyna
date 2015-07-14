function LoaderHelper() {  
}

LoaderHelper.prototype = {
    showLoader: function(text, textVisible, textOnly) {        
        var $this = $(this),
            theme = $this.jqmData('theme') || $.mobile.loader.prototype.options.theme,
//            text = $this.jqmData('msgtext' ) || $.mobile.loader.prototype.options.text,
//            textVisible = $this.jqmData('textvisible') || $.mobile.loader.prototype.options.textVisible,
//            textOnly = !!$this.jqmData('textonly'),
            html = $this.jqmData('html') || '';
            
        $.mobile.loading('show', {
            text: text,
            textVisible: textVisible,
            theme: theme,
            textOnly: textOnly,
            html: html
        });
    },
    
    hideLoader: function() {
        $.mobile.loading('hide');
    }                                
};


