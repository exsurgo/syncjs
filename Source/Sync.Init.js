
//Initialize 
Sync.init({

    //The page just loaded
    onPageLoad: function() { },

    //Link click
    onLinkClick: function (link) { },

    //Form click
    onFormClick: function (form) { },
        
    //Request event
    onRequest: function (url, sender, formData) { },

    //Success event
    onSuccess: function (result) { },

    //Before update event
    onBeforeUpdate: function (update, meta) { },

    //After update event
    onAfterUpdate: function (update, meta) { },

    //Complete event
    onComplete: function () { },

    //Error event
    onError: function (result) { }
    
});

