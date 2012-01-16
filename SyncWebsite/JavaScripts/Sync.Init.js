
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
    request: function (url, postData, sender) {

        //Add TinyMCE rich text to post data
        if (postData) {
            $(sender).find("[data-richtext]").each(function () {
                var textbox = $(this);
                if (typeof tinyMCE != "undefined") tinyMCE.triggerSave();
                postData.push({
                    name: textbox.attr("name"),
                    value: textbox.val()
                });
            });
        }

    },

    //A request was successful
    success: function (result, metadata, xhr) {

    },

    //A request resulted error
    error: function (message, xhr) {

        //Show friendly error message
        alert("An unexpected error has occurred.", "error");

    },

    //An element is about to be updated in the DOM
    updating: function (element, metadata) {

    },

    //An element was just updated in the DOM
    updated: function (element, metadata) {

    },

    //The result was successful and all updates have been made
    complete: function (metadata) {

    },

    //Initialize HTML after page load or elements update
    init: function (element, metadata) {

        //Code syntax highlighting
        SyntaxHighlighter.defaults["toolbar"] = false;
        SyntaxHighlighter.highlight(document.body);

        //Replace temp fixes
        //Keep scripts from being run and script highlighter from breaking
        $("code:contains(script-temp)", element).text("script");
        $("code:contains(body-temp)", element).text("body");
        $("code:contains(head-temp)", element).text("head");
        $("code:contains(html-temp)", element).text("html");
        $("code:contains(data-callback-temp)", element).text("data-callback");
        $("code:contains(data-load-temp)", element).text("data-load");
        $("code:contains(href-temp)", element).text("data-load");

    }

});
