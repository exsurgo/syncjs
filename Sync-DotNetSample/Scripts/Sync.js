
/*
*   Sync JS - v 0.9.1.3
*   Dependencies: jQuery UI, HashChange plugin
*/

Sync = {

    /********** Config **********/

    config: {

        //General 
        autoEvents: true, //Automatically hijax every link and form
        autoCorrectLinks: true, //Change standard URL's to ajax (#) URL's
        contentId: "content", //The main content area where content is rendered
        topContentId: "content-top", //The content area right above the main content
        bottomContentId: "content-bottom", //The content area right below the main content
        pageTitlePrefix: "", //Prepend to title of each page
        submitFilter: ".placeholder", //Don't submit any form elements that match this
        subRowCss: "subrow", //CSS class of table subrows
        rowSelectCss: "rowselect", //CSS class of selected rows
        scriptPath: "/Scripts", //Path to download dependent scripts from

        //Progress indicator
        progressId: "progress", //Progress indicator id
        progressText: "One Moment...", //Progress indicator text
        progressCss: "progress", //Progress indicator CSS style

        //Global events
        onRequest: function () { }, //A request is made
        onSuccess: function () { }, //A response is received
        onBeforeUpdate: function () { }, //Just before content is updated in the DOM
        onAfterUpdate: function () { }, //Just after content is updated in the DOM
        onComplete: function () { }, //The request and updated have been successfully completed
        onError: function () { }, //Request resulted in an error

        //Window provider
        windowProvider: {
            showWindow: function (id, content, data) { },
            closeWindow: function (id) { }
        },

        //Client template provider
        templateProvider: {
            render: function (template, data) { }
        },

        //Local storage provider
        storageProvider: {
            store: function (key, data) { },
            get: function (key) { },
            remove: function (key) { },
            exists: function (key) { }
        },

        //Custom update types
        customUpdaters: [],

        //Routes
        routes: []

    },

    /********** Methods **********/

    //Init
    init: function (config) {

        //Content area
        var content = $("#" + this.config.contentId);

        //Combine default config with provided
        this.config = $.extend(this.config, config);

        //Add page title prefix
        var title = document.title;
        var prefix = config.pageTitlePrefix;
        if (prefix && title.slice(0, prefix.length) != prefix) document.title = prefix + document.title;

        //Change standard URL to Ajax URL
        if (this.config.autoCorrectLinks) {
            var path = location.pathname;
            if (path != "/") {
                content.hide();
                if (path.charAt(0) == "/") path = path.substr(1);
                location.replace("/#" + path + location.search);
            }
        }

        //Handle initial hash value
        var hash = location.hash.substr(1);
        if (hash.length > 1) {
            //Empty content area
            content.empty();
            //If url has "!" remove it, it prevents request from being made
            //Remove it on the plugin initialization, page was just reloaded
            if (hash.charAt(0) == "!") location.hash = hash.substr(1);
            //Make request
            else Sync.request(hash);
        }

        //Hash change - Back button support
        $(window).hashchange(function () {
            var hash = location.hash.substr(1);
            //If hash is not current address and isn't prefixed with "!", then make request
            if (hash.charAt(0) != "!" && $(window).data("_updater_address") != hash) {
                if (hash == "") hash = "/";
                Sync.request(hash);
            }
        });

        //Attach events to body
        this.initView("body");

        //Create progress indicator
        $("body").append("<div id=\"" + this.config.progressId + "\" class=\"" + this.config.progressCss + "\">" + this.config.progressText + "</div>");
    },

    //Request
    request: function (url, sender, formData) {

        //Reload page with hash value
        if (url == "#" || url.charAt(0) == "~") return;

        config = this.config;
        sender = $(sender);

        //Response level metadata
        var navKey;

        //On request event
        config.onRequest(url, sender, formData);

        //No requests for .7 sec
        var doc = $(document);
        if (doc.data("_updater_hold") != null) return;
        else {
            doc.data("_updater_hold", true);
            setTimeout(new function () { $(document).removeData('_updater_hold'); }, 700);
        }

        //Confirm request
        /*
        *   data-confirm="true"
        *   data-confirm="delete"
        *   data-confirm="Are you sure you want to delete this item?"
        */
        if (sender) {
            var val = sender.attr("data-confirm");
            if (!val) val = sender.find("submit:first").attr("data-confirm");
            if (val) {
                if (val == "true" && !confirm("Are you sure you want to do this?")) return false;
                if (val.indexOf(" ") == -1 && !confirm("Are you sure you want to " + val + "?")) return false;
                if (val.indexOf(" ") > -1 && !confirm(val)) return false;
            }
        }

        //Remove host header & hash
        url = url.replace(/(http|https):\/\/[a-z0-9-_.:]+/i, "").replace(/#/, "");

        //Show Progress
        Sync.toggleProgress(true);

        //Begin request
        var method = formData == undefined ? "GET" : "POST";
        $.ajax({

            //Parameters
            type: method,
            url: url,
            data: formData,
            cache: false,

            //Success event
            success: function (result, status, xhr) {

                //On success event
                config.onSuccess(result);

                //Close window on post
                if (method == "POST") $(sender).closest(".ui-dialog > div").dialog("destroy").remove();

                //Get return type (HTML, JSON, etc)
                var contentType = (xhr.getResponseHeader("content-type") || "").toLowerCase();

                //Text/HTML response
                if ((/html/i).test(contentType)) Sync.handleHtml(result, sender, url);

                //JSON Response
                else if ((/json/i).test(contentType)) Sync.handleJson(result, sender, url);

                //Hide progress
                Sync.toggleProgress(false);

                //Enable sender
                Sync.toggleSender(sender, true);

                //On complete
                config.onComplete(navKey);

            }, //End Success event

            //Error event
            error: function (xhr, status, error) {

                //Enable sender
                Sync.toggleSender(sender, true);

                //Hide progress
                Sync.toggleProgress(false);

                //Call error event
                config.onError(error);
            }

        }); //End begin request

    },

    //Close element
    close: function (type, selector) {

        var el = $(selector);
        if (!el.length) return;

        switch (type.toLowerCase()) {

            //Update            
            case "update":
                var update = el.closest("[data-update]");
                //Remove
                var subrow = update.closest(".subrow");
                update.remove();
                //Close SubRow if empty
                if (subrow.find("td:first > *:first").length == 0) subrow.remove();
                break;

            //Window            
            case "window":
                el.closest(".ui-dialog").dialog("destroy").remove();
                break;

            //Row            
            case "row":
                var grid = el.closest(".grid");
                var row;
                if (el.length && el[0].tagName == "TR") row = el;
                else row = el.closest("tr").andSelf.remove();
                //Close
                if (row.next().hasClass("subrow")) row.next().remove();
                row.remove();
                //Re-strip
                grid.find("tr").removeClass("rowalt");
                grid.find("tr:not(.group):not(.subrow):not(:has(th)):odd").addClass("rowalt");
                break;

            //Parent           
            case "parent":
                el.parent().remove();
                break;
        }

    },

    //Redirect
    redirect: function (url) {
        Sync.toggleProgress(true);
        window.location = url;
    },

    //Render a template for an object
    render: function (template, model) {
        //Get template html
        //var str = $("#" + template).html();
        //var str = window.__templates[template];
        var str = config.storageProvider.get(template);
        //Check cache
        var _tmplCache = {};
        var func = _tmplCache[str];
        //Check 
        if (!func) {
            //Parse template
            str = str
                .replace(/[\r\t\n]/g, " ")
                .split("<%").join("\t")
                .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                .replace(/\t=(.*?)%>/g, "',$1,'")
                .split("\t").join("');")
                .split("%>").join("p.push('")
                .split("\r").join("\\'");
            //Create template function
            var strFunc = "var p=[],print=function(){p.push.apply(p,arguments);};p.push('" + str + "');return p.join('');";
            func = new Function(strFunc);
            _tmplCache[str] = func;
        }
        return func.call(model);
    },

    //Render templates for an array
    renderAll: function (template, models) {
        var html = "";
        $(models).each(function () {
            html += Sync.render(template, this);
        });
        return html;
    },

    //Determine if template if available
    templateExists: function (id) {

    },

    //Load dependent scripts
    loadScripts: function (scripts) {
        $(scripts).each(function () {
            var src = $.trim(this);
            //Append 'scriptPath' setting if available
            var path = Sync.config.scriptPath;
            if (path) {
                if (!path.match(/\/$/)) path += "/";
                src = path + src;
            }
            //Call with ajax to access config
            //TODO: Allow multiple scripts to be requested at once
            $.ajax({
                type: "GET",
                url: src,
                dataType: "script",
                cache: true, //Enable caching
                async: false //Can't be async, must be loaded first
            });
        });
    },

    /********** Helpers **********/

    //Handle html update
    handleHtml: function (result, sender, url) {

        //Load any script dependencies via script tags 
        //Temporarily replace script tag names with 'tempscript'
        //Otherwise the src will be requested early
        var scripts = [];
        result = result.replace(/<script /i, "<tempscript ");
        $(result).filter("tempscript[src]").each(function () {
            //Store src to request later
            scripts.push(this.getAttribute("src"));
        }).remove();
        result = result.replace(/<scripttemp /i, "<tempscript ");
        Sync.loadScripts(scripts);

        //Store any client templates
        $(result).filter("[data-template]").each(function () {
            //if (!window.__templates) window.__templates = {};
            //window.__templates[] = this.outerHTML;
            config.storageProvider.store(this.getAttribute("data-template"), this.outerHTML);
        });

        //Update returned elements
        $(result).filter("[data-update]:not([data-template])").each(function () {

            var update = $(this);

            //Read metadata
            var meta = update.data();
            meta.update = meta.update.toLowerCase();

            //Remember metadata for later
            //if (meta.nav != undefined) navKey = meta.nav;

            //Update actions
            if (meta.hide) $(meta.hide).hide();
            if (meta.show) $(meta.show).show();
            if (meta.empty) $(meta.empty).show();
            if (meta.remove) $(meta.remove).show();

            //Close
            if (meta.closeUpdate) Sync.close("update", meta.closeUpdate);
            if (meta.closeWindow) Sync.close("window", meta.closeWindow);
            if (meta.closeRow) Sync.close("row", meta.closeRow);
            if (meta.closeParent) Sync.close("parent", meta.closeParent);

            //On before update
            config.onBeforeUpdate(update, meta);

            //Hide update
            update.hide();

            //Update element in the DOM
            Sync.updateElement(update, meta, sender, url);

            //On after update
            config.onAfterUpdate(update, meta);

            //Show update
            update.show();

            //Events
            Sync.initView(update);

        });

        //Run inline scripts
        $(result).filter("script:not([src])").each(function () {
            $.globalEval($(this).html());
        });

    },

    //Handle json update
    handleJson: function (result, sender, url) {

        //Check routes to match url with needed template
        $(Sync.routes).each(function () {

            //If route matches, then request template
            if (this.regex.test(url)) {

                //Request templates
                if (!config.storageProvider.exists(this.templateId)) request(this.templateUrl);
                var template = config.storageProvider.get(this.templateId);
                
                //Render template with data and convert to jquery object
                var update = $(Sync.render(this.templateId, result));

                //Update output
                Sync.updateElement(update, update.data(), sender, url);
            }

        });

    },

    //Update html element
    updateElement: function (update, meta, sender, url) {

        //Ensure id
        var id = update.attr("id");
        if (id == "" || id == undefined) {
            id = ("el-" + Math.random()).replace(".", "");
            update.attr("id", id);
        }

        //Make updates
        switch (meta.update) {

            // Content              
            /*  
            *   title: string 
            *   address: string 
            *   nav: [string|null|false]
            *   top: selector 
            *   bottom: selector        
            */ 
            case "content":
                //Address
                if (meta.address && meta.address != "") url = meta.address;
                if (url.charAt(0) == "/") url = url.substr(1);
                $(window).data("_updater_address", url);
                if (window.location.hash.substr(1) != url) {
                    if (url != "/") {
                        window.location.hash = url;
                    }
                    else window.location.hash = "";
                }
                //Page Title
                if (meta.title) document.title = config.pageTitlePrefix + meta.title;
                //Top content
                var topContent = $("#" + config.topContentId);
                if (meta.top) topContent.children(":not(" + meta.top + ")").remove();
                else topContent.empty();
                //Bottom content
                var bottomContent = $("#" + config.bottomContentId);
                if (meta.bottom) bottomContent.children(":not(" + meta.bottom + ")").remove();
                else bottomContent.empty();
                //Content
                $("#" + config.contentId).empty().append(update);
                //Scroll to top by default
                if (!meta.scroll) $(window).scrollTop(0);
                break;

            // Window                                                                                                                                                                                                                                                                                                                                             
            /*
            *   title: string
            *   modal: bool 
            *   width: int
            *   height: int
            *   maxWidth: int
            *   maxHeight: int
            *   minWidth: int
            *   minHeight: int
            *   nopad: bool
            *   overflow: bool
            *   icon: string
            */ 
            case "window":
                //Show in content area if empty
                if (content.children().length == 0) content.html(update);
                //Show window
                else {
                    //Close existing window
                    $("#" + id).dialog("destroy").remove();
                    //Window params
                    var params = $.extend(meta,
                    {
                        modal: meta.modal == false ? false : true,
                        resizable: false,
                        width: meta.width ? meta.width : "auto",
                        height: meta.height ? meta.height : "auto",
                        open: function () {
                            var win = $(this).parent(".ui-dialog");
                            update.removeAttr("id");
                            win.attr("id", id);
                            var winTitle = win.find(".ui-dialog-titlebar");
                            var winContent = win.find(".ui-dialog-content");
                            //Overflow
                            if (meta.overflow) win.find(".ui-dialog-content").andSelf().css("overflow", "visible");
                            //No padding
                            if (meta.nopad) winContent.css("padding", 0);
                            //Icon
                            if (meta.icon) winTitle.find(".ui-dialog-title").prepend("<img src='/Images/" + meta.icon + ".png'/>");

                            //Recenter on window resize
                            $(window).bind("resize." + id, function () {
                                win.position({ at: "center", my: "center", of: window });
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
                    update.dialog(params);
                }
                break;

            // Table SubRow                                                                                                                                       
            /*
            *   target: selector
            */ 
            case "subrow":
                //Replace if exists
                var sub = $("#" + id);
                if (sub.length) sub.replaceWith(update);
                //Add new
                else {
                    //Get target row, subrow goes after
                    var tr = meta.target ? $(meta.target) : $(sender).parents("tr:first");
                    //Show in content area if not found
                    if (tr.length == 0) content.html(update).find(".close-button").remove();
                    //Add row
                    else {
                        if (!tr.next().hasClass(config.subRowCss)) {
                            var cols = tr.find("> td").length;
                            tr.after("<tr class='" + config.subRowCss + "'><td colspan='" + cols + "'></td></tr>");
                        }
                        //Selected row
                        $("." + config.rowSelectCss).removeClass(config.rowSelectCss);
                        $(tr).closest("tr").addClass(config.rowSelectCss);
                        //Add update
                        var zone = tr.next().find("td:first");
                        zone.prepend(update);
                        //IE8 Rendering Fix
                        if ($.browser.msie && $.browser.version == "8.0") zone.find("table").hide().slideDown(1);
                    }
                }
                break;

            // Table Row                                                                                                                                                                                                                                                                                                                                    
            /*
            *   target: selector
            */ 
            case "row":
                //Get self or first table
                if (!meta.target) meta.target = "#content";
                var table = $(meta.target);
                if (table[0].tagName != "TABLE") table = $("table:first");
                //Add tbody
                if (!table.find("tbody").length) table.append("<tbody></tbody>");
                //Replace existing row
                if (table.find("#" + id).length) table.find("#" + id).replaceWith(update);
                //Add new row
                else {
                    var rows = table.find("tbody > tr:not(:has(th))");
                    if (meta.position == "bottom") rows.last().after(update);
                    else rows.first().before(update);
                }
                //Select row
                $("." + config.rowSelectCss).removeClass(config.rowSelectCss);
                var row = table.find("#" + id);
                row.addClass(config.rowSelectCss);
                //Hide empty
                //TODO: Remove this
                table.next(".empty:first").hide();
                break;

            //Replace                                                                                                                                                                                                                                                                                                    
            case "replace":
                $("#" + id).replaceWith(update);
                break;

            // Insert                                                                                                                                                                                                                                                                                                    
            /*
            *   target: selector
            */ 
            case "insert":
                var target = $(meta.target);
                target.html(update);
                break;

            // Prepend                                                                                                                                                                                           
            /*
            *   target: selector
            */ 
            case "prepend":
                var existing = $("#" + id);
                if (existing.length) existing.replaceWith(update);
                else $(meta.target).prepend(update);
                break;

            // Append                                                                                                                                                                                            
            /*
            *   target: selector
            */ 
            case "append":
                var existing = $("#" + id);
                if (existing.length) existing.replaceWith(update);
                else $(meta.target).append(update);
                break;

            //Top                                                                                                                                                                                                                                                              
            case "top":
                var topContent = $("#" + config.topContentId);
                topContent.empty().prepend(update);
                break;

            //Bottom                                                                                                                                                                                                                                                               
            case "bottom":
                var bottomContent = $("#" + config.bottomContentId);
                bottomContent.empty().prepend(update);
                break;
        }

    },

    //Initialize any events or prerequisites 
    initView: function (context) {

        var config = Sync.config;

        //Scroll
        //TODO: Need to test this
        $("[data-scroll=true]", context).each(function () {
            $(window).scrollTop($(this).offset().top);
        });

        //Link click
        $(config.autoEvents ? "a:not([href=#],[href^=#],[href^=javascript],[href^=mailto],[data-ajax=false],[data-submit])" : "a:[data-ajax=true]", context).each(function () {
            var link = $(this);
            var url = link.attr("href");
            //Ensure isn't external link
            var base = window.location.protocol + "//" + window.location.hostname;
            if (url && url != "" && url.charAt(0) != "/" && base != url.slice(0, base.length)) {
                //Open all external links in new windows
                link.attr("target", "_blank");
                return;
            }
            //Remove any existing click events
            link.unbind("click");
            //Modify links to include hash
            if (config.autoCorrectLinks && url != undefined && url[0] == "/") {
                url = "#" + url.substr(1);
                link.attr("href", url);
            }
            //Don't attach event if link opens in new window
            if (link.attr("target") == "_blank") return;
            //Click
            link.click(function (e) {
                e.preventDefault();
                //Modify link
                if (url[0] == "#") url = "/" + url.substr(1);
                //Update details
                var details = link.attr("data-details");
                if (details != undefined && $("#" + details).length) url += (url.indexOf("?") != -1 ? "&" : "?") + "UpdateDetails=True";
                //Get request
                Sync.request(url, this);
                return false;
            });
        });

        //Form submit
        $(config.autoEvents ? "form:not([data-ajax=false])" : "form:[data-ajax=true]", context).unbind("submit").submit(function (e) {
            var form = $(this);
            //Return if no ajax
            if (form.attr("data-ajax") == "false") return;
            //Prevent default
            e.preventDefault();
            //Ensure unique ids
            form.attr("id", ("form-" + Math.random()).replace(".", ""));
            //Required for TinyMCE
            if (typeof tinyMCE != "undefined") tinyMCE.triggerSave();
            //Serialize form data, exclude filtered items
            var data = form.find(":input").not(config.submitFilter).serialize();
            //Disable form
            Sync.toggleSender(form, false);
            //Post request
            Sync.request(form.attr("action"), this, data);
            return false;
        });

        //Submit button click
        $(config.autoEvents ? ":submit([data-ajax=false])" : ":submit[data-ajax=true]", context).unbind("click").click(function (e) {
            var form = $(this).parents("form:first");
            //Return if no ajax
            if (form.attr("data-ajax") == "false") return;
            //Prevent default
            e.preventDefault();
            //Submit form
            form.submit();
            return false;
        });

        //Request
        $("[data-request]", context).click(function () { Sync.request($(this).attr("data-request"), this); });

        //Close
        $("[data-close]", context).click(function () { Sync.close($(this).attr("data-close"), this); });

        //Submit on dropdown change
        $("select[data-submit=true]", context).change(function () {
            $(this).parent("form:first").submit();
        });

        //Submit on click
        $("[data-submit=true]:not(select)", context).click(function () {
            $(this).parent("form:first").submit();
        });

        //On click actions
        $("[data-hide]").click(function () { $($(this).attr("data-hide")).hide(); });
        $("[data-show]").click(function () { $($(this).attr("data-show")).show(); });
        $("[data-remove]").click(function () { $($(this).attr("data-remove")).remove(); });
        $("[data-empty]").click(function () { $($(this).attr("data-empty")).hide(); });

        //Autoset focus
        var el = $("[data-focus=true]", context);
        if (el.length > 0) setTimeout(function () { el.first().focus(); }, 100);
        else setTimeout(function () { $(":input:first:not([data-focus=false])", context).focus(); }, 100);

        //Load dependent scripts
        $(context).find("[data-load]").andSelf().filter("[data-load]").each(function () {
            var scripts = this.getAttribute("data-load").split(",");
            Sync.loadScripts(scripts);
        });

        //Run callbacks
        $(context).find("[data-callback]").andSelf().filter("[data-callback]").each(function () {
            //Get the function object by string name
            //Account for namespaces if name has "."
            var el = $(this),
                parts = el.attr("data-callback").split("."),
                obj = window;
            for (var i = 0; i < parts.length; ++i) {
                obj = obj[parts[i]];
            }
            //Run method, use updated content for "this" value
            obj.call(el);
        });
    },

    //Show/Hide progress
    toggleProgress: function (show) {

        var progress = $("#" + Sync.config.progressId);

        //Show
        if (show) {
            //Show and center
            progress.show().position({ at: "center", my: "center", of: window });
            //Recenter on window resize
            $(window).bind("resize._progress", function () {
                progress.position({ at: "center", my: "center", of: window });
            });
        }

        //Hide
        else {
            //Hide
            progress.hide();
            //Unbind resize event
            $(window).unbind("resize._progress");
        }

    },

    //Disable/Enable sender
    toggleSender: function (sender, enabled) {
        //Form
        if ($(sender).is("form")) {
            if (enabled) sender.find("input,textarea,select,button").removeAttr("disabled", "disabled");
            else sender.find("input,textarea,select,button,:password").attr("disabled", "disabled");
        }
        //TODO: Disable other sender types
    }

};


/*
*   jQuery hashchange event - v1.3 - 7/21/2010
*   http://benalman.com/projects/jquery-hashchange-plugin/
*
*   Copyright (c) 2010 Ben Alman
*   Dual licensed under the MIT and GPL licenses.
*   http://benalman.com/about/license/
*/
(function (j, o, r) { var q = "hashchange", l = document, n, m = j.event.special, k = l.documentMode, p = "on" + q in o && (k === r || k > 7); function s(a) { a = a || location.href; return "#" + a.replace(/^[^#]*#?(.*)$/, "$1") } j.fn[q] = function (a) { return a ? this.bind(q, a) : this.trigger(q) }; j.fn[q].delay = 50; m[q] = j.extend(m[q], { setup: function () { if (p) { return false } j(n.start) }, teardown: function () { if (p) { return false } j(n.stop) } }); n = (function () { var d = {}, e, a = s(), c = function (h) { return h }, b = c, f = c; d.start = function () { e || g() }; d.stop = function () { e && clearTimeout(e); e = r }; function g() { var h = s(), i = f(a); if (h !== a) { b(a = h, i); j(o).trigger(q) } else { if (i !== a) { location.href = location.href.replace(/#.*/, "") + i } } e = setTimeout(g, j.fn[q].delay) } j.browser.msie && !p && (function () { var i, h; d.start = function () { if (!i) { h = j.fn[q].src; h = h && h + s(); i = j('<iframe tabindex="-1" title="empty"/>').hide().one("load", function () { h || b(s()); g() }).attr("src", h || "javascript:0").insertAfter("body")[0].contentWindow; l.onpropertychange = function () { try { if (event.propertyName === "title") { i.document.title = l.title } } catch (t) { } } } }; d.stop = c; f = function () { return s(i.location.href) }; b = function (w, z) { var x = i.document, y = j.fn[q].domain; if (w !== z) { x.title = l.title; x.open(); y && x.write('<script>document.domain="' + y + '"<\/script>'); x.close(); i.location.hash = w } } })(); return d })() })(jQuery, this);