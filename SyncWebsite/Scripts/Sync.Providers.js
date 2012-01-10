
Sync.providers = {

    //Storage provider - Amplify.js
    storage: {
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
    template: {
        render: undefined //function (template, data) { }
    },

    //Window provider
    window: {
        show: function (id, content, data) {
            
        },
        close: function (id) { }
    },

    //Loading indicator provider
    laoding: {
        show: function () { },
        hide: function () { }
    }
    
}
