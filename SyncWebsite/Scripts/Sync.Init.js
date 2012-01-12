
//Initialize 
Sync.init({

    //The page just loaded
    onPageLoad: function() {

        //Initialize body
        InitView("body");

        //Remove web hosting items
        $("#footer ~ *:not(#progress)").remove();
        $("html ~ *:not(#progress)").remove();
            
    },

    //Link click
    onLinkClick: function (link) { },

    //Form click
    onFormClick: function (form) {
        
        //Required for TinyMCE
        if (typeof tinyMCE != "undefined") tinyMCE.triggerSave();
        
    },
        
    //Request event
    onRequest: function (url, sender, formData) { },

    //Success event
    onSuccess: function (result) { },

    //Before update event
    onBeforeUpdate: function (update, meta) { },

    //After update event
    onAfterUpdate: function (update, meta) {
        
        //Initialize any scripts or plug-in
        InitView(update);
        
    },

    //Complete event
    onComplete: function () { },

    //Error event
    onError: function (result) {
        alert("An unexpected error has occurred.");
    }
    
});


/**** Initialize scripts and plugins ****/
function InitView(context) {

    //Code syntax highlighting
    SyntaxHighlighter.defaults["toolbar"] = false;
    SyntaxHighlighter.highlight(document.body);
    //Syntax fixes
    $("code:contains(scriptt)").text("script");
    $("code:contains(bodyy)").text("body");
    $("code:contains(headd)").text("head");
    $("code:contains(htmll)").text("html");

}


/**** Override default alert with growl ****/
function alert(text, type) {
    $(function () {
        if (text) {
            var duration = text.length * 120;
            $.jGrowl(text, {
                life: duration,
                theme: (type ? "jGrowl-alert-" + type.toLowerCase() : "")
            });
        }
    });
}