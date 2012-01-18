
//Initialize
Sync.init({

    //Config
    scriptPath: "/JavaScripts",

    //The document is ready
    ready: function () {

        //Override default alert
        window.alert = function alert(text, type) {
            if (text) {
                var duration = text.length * 120;
                $.jGrowl(text, {
                    life: duration,
                    theme: (type ? "jGrowl-alert-" + type.toLowerCase() : "")
                });
            }
        };

        //Remove web hosting items
        $("#footer ~ *:not(#progress)").remove();
        $("html ~ *:not(#progress)").remove();

    },

    //A request is being made
    request: function (e) {

        //Add TinyMCE rich text to post data
        if (e.isPost) {
            $(e.sender).find("[data-richtext]").each(function () {
                var textbox = $(this);
                if (typeof tinyMCE != "undefined") tinyMCE.triggerSave();
                e.postData.push({
                    name: textbox.attr("name"),
                    value: textbox.val()
                });
            });
        }

    },

    //A request was successful
    success: function (e) {

    },

    //A request resulted error
    error: function (e) {

        //Show friendly error message
        alert("An unexpected error has occurred.", "error");

    },

    //An element is about to be updated in the DOM
    updating: function (e) {

    },

    //An element was just updated in the DOM
    updated: function (e) {

    },

    //The result was successful and all updates have been made
    complete: function (e) {

    },

    //Initialize HTML after page load or elements update
    init: function (e) {   

        //Code syntax highlighting
        SyntaxHighlighter.defaults["toolbar"] = false;
        SyntaxHighlighter.highlight(document.body);

        //Replace temp fixes
        //Keep scripts from being run and script highlighter from breaking
        $("code:contains(script-temp)", this).text("script");
        $("code:contains(body-temp)", this).text("body");
        $("code:contains(head-temp)", this).text("head");
        $("code:contains(html-temp)", this).text("html");
        $("code:contains(data-callback-temp)", this).text("data-callback");
        $("code:contains(data-load-temp)", this).text("data-load");
        $("code:contains(href-temp)", this).text("data-load");

    }

});
