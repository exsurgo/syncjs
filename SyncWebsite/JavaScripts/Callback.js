
var CallbackController = {
    
    //Callback function
    init: function () {
        alert("The dependency Callback.js was loaded and the function 'init' has been run.", "success");
        //The 'this' keyword refers to the update jquery object
        this.append("<b>This element was added by the callback.</b>");
    }

}