
/**** Page load ****/
$(function () {

    //Initialize dynamic updates
    Sync.init({

		//Custom config settings here
	
        //Request event
        onRequest: function (url, sender, formData) { },

        //Success event
        onSuccess: function (result) { },

        //Before update event
        onBeforeUpdate: function (update, meta) { },

        //After update event
        onAfterUpdate: function (update, meta) {},

        //Complete event
        onComplete: function (navKey) { },

        //Error event
        onError: function (result) {}

    });

});
