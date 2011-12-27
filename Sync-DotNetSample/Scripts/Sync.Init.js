
/**** Page load ****/
$(function () {

    //Initialize dynamic updates
    Sync.init({

        //General settings
        scriptPath: "/Scripts",

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
        onComplete: function (navKey) {
             SyntaxHighlighter.all();
        },

        //Error event
        onError: function (result) {
            alert("An unexpected error has occurred.");
        },

        //Storage provider
        storageProvider: {
            //PersistJS
            //            store: function (key, data) {
            //                var store = new Persist.Store("local-store");
            //                store.set(key, data);
            //            },
            //            get: function (key) {
            //                var store = new Persist.Store("local-store");
            //                store.get(key);
            //            },
            //            remove: function (key) {
            //                var store = new Persist.Store("local-store");
            //                store.remove(key);
            //            }
            //            //Amplify
            store: function (key, data) {
                amplify.store(key, data);
            },
            get: function (key) {
                return amplify.store(key);
            },
            remove: function (key) {

            }
        },

        //Routes
        routes:
        [
            //Task controller
            { regex: /$Task(s)?\//, scripts: ["/Scripts/Controllers/TaskController.js"] },
            //Milestone controller
            {regex: /$Milestone(s)?\//, scripts: ["/Scripts/Controllers/MilestoneController.js"] }
        ]


    });

    //Initialize body
    InitView("body");
    SyntaxHighlighter.all();
});


/**** Initialize scripts and plugins ****/
function InitView(context) {

    //Code syntax highlighting
    SyntaxHighlighter.all();
    
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