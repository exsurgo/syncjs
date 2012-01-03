
//Local storage provider
Sync.Providers = {

    storageProvider: {
        //Store
        store: function (key, data) {
            amplify.store(key, data);
        },
        //Get
        get: function (key) {
            return amplify.store(key);
        },
        //Remove
        remove: function (key) {

        }
    },

    //Template provider
    templateProvider: {
        render: function (template, data) { },
        renderAll: function (templates, data) { }
    },

    //Window provider
    windowProvider: {
        showWindow: function (id, content, data) { },
        closeWindow: function (id) { }
    }
}
