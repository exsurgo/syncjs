
var Todos = {

    saved: function (result, metadata, sender) {
        if (result && result.Succeeded) {
            alert("Todo was saved!", "success");
            var textbox = sender.find("[name=Title]");
            var list = $("#todo-list");
            list.append("<li>" + textbox.val() + "</li>");
            textbox.val("");
        }
    }

};