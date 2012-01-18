
var Todos = {

    saved: function (e) {
        //"this" is the JSON result from the server
        if (this && this.Succeeded) {
            alert("Todo was saved!", "success");
            var textbox = e.sender.find("[name=Title]");
            var list = $("#todo-list");
            list.append("<li>" + textbox.val() + "</li>");
            textbox.val("");
        }
    }

};