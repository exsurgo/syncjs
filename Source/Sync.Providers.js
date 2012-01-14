
//Provider allow for custom implementations of common functions
Sync.providers = {

    /*
    *   Storage Provider
    *   Dependent on AmplifyJS
    */
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

    //Template Provider
    template: {
        render: undefined //function (template, data) { }
    },

    /*
    *   Window Provider
    *   Dependent on jQuery UI dialog
    */
    window: {
        /*
        *   "data-close=true" to close window
        *   title: {string}
        *   modal: {bool} 
        *   width: {int}
        *   height: {int}
        *   maxWidth: {int}
        *   maxHeight: {int}
        *   minWidth: {int}
        *   minHeight: {int}
        *   nopad: {bool}
        *   overflow: {bool}
        *   icon: {string}
        */
        create: function (id, element, metadata) {
            //Get content area
            var contentArea = $(Sync.config.contentSelector);
            //Show in content area if empty
            if (contentArea.children().length == 0) contentArea.html(element);
            //Show window
            else {
                //Close existing window
                $("#" + id).dialog("destroy").remove();
                //Window params
                var params = $.extend(metadata,
                {
                    modal: metadata.modal == false ? false : true,
                    resizable: false,
                    width: metadata.width ? metadata.width : "auto",
                    height: metadata.height ? metadata.height : "auto",
                    open: function () {
                        var win = $(this).parent(".ui-dialog");
                        element.removeAttr("id");
                        win.attr("id", id);
                        var winTitle = win.find(".ui-dialog-titlebar");
                        var winContent = win.find(".ui-dialog-content");
                        //Overflow
                        if (metadata.overflow) win.find(".ui-dialog-content").andSelf().css("overflow", "visible");
                        //No padding
                        if (metadata.nopad) winContent.css("padding", 0);
                        //Icon
                        if (metadata.icon) winTitle.find(".ui-dialog-title").prepend("<img src='/Images/" + metadata.icon + ".png'/>");
                        //Recenter on window resize
                        $(window).bind("resize." + id, function () {
                            //Recenter if exists
                            if (win.length) win.position({ at: "center", my: "center", of: window });
                            //Unbind if doesn't exists
                            else $(window).unbind("resize." + id);
                        });
                        //Recenter on delay
                        setTimeout(function () { win.position({ at: "center", my: "center", of: window }); }, 10);
                    },
                    close: function () {
                        //Unbind window resize handler
                        $(window).unbind("resize." + id);
                        //Remove window
                        $(this).remove();
                    },
                    drag: function () {
                        //Unbind window resize handler
                        $(window).unbind("resize." + id);
                        //Remove recenter
                        $(this).parents(".ui-dialog:first");
                    }
                });
                //Show window
                element.dialog(params);
                //Close event
                element.find("[data-close=true]").click(function () {
                    Sync.window.close(this);
                });
            }
        },
        close: function (selector) {
            $(selector).closest(".ui-dialog").dialog("destroy").remove();
        }
    },

    /*
    *   Loading Indicator Provider
    *   Dependent on jQuery UI position
    */
    loading: {
        show: function () {
            //Get indicator
            var loading = $("#loading-indicator");
            //Create indicator if not exists
            if (!loading.length) {
                $("body").append("<div id=\"loading-indicator\">One Moment...</div>");
                loading = $("#loading-indicator");
            }
            //Show and center
            loading.show().position({ at: "center", my: "center", of: window });
            //Recenter on window resize
            $(window).bind("resize._loading", function () {
                loading.position({ at: "center", my: "center", of: window });
            });
        },
        hide: function () {
            //Get indicator
            var loading = $("#loading-indicator");
            //Hide
            loading.hide();
            //Unbind resize event
            $(window).unbind("resize._loading");
        }
    }

}
