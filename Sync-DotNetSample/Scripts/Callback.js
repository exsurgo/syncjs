
var CallbackController = {

    init: function () {
        alert("The dependency Callback.js was loaded and the function 'init' has been run.  The callback can access the update with the 'this' keyword.", "success");
        this.append("<b>This element was added by the callback.</b>");
    }

}