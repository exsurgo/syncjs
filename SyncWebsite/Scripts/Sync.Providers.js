
Sync.providers = {

    //Storage provider - Amplify.js
    storageProvider: {
        store: function (key, data) {
            amplify.store.sessionStorage(key, data);
        },
        get: function (key) {
            return amplify.store.sessionStorage(key);
        },
        remove: function (key) {
            amplify.store.sessionStorage(key, null);
        },
        exists: function (key) {
            var store = amplify.store.sessionStorage();
            return store[key] != undefined;
        }
    },

    //Template provider
    templateProvider: {
        render: undefined //function (template, data) { }
    },

    //Window provider
    windowProvider: {
        showWindow: function (id, content, data) { },
        closeWindow: function (id) { }
    },

    //Loading indicator provider
    loadingProvider: {
        showLoading: function () { },
        hideLoading: function () { }
    }
    
}
