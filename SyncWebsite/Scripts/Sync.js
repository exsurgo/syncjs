
/*
*   Sync JS - v 0.9.1.52
*   Dependencies: jQuery UI, HashChange plugin
*/

var Sync = Sync || (function () {

    /********* Config *********/

    //Configuration
    this.config = {

        //General 
        autoEvents: true, //Automatically hijax every link and form
        autoCorrectLinks: true, //Change standard URL's to ajax (#) URL's
        contentSelector: "[data-content=true]:first", //The main content area where content is rendered
        topContentId: "content-top", //The content area right above the main content
        bottomContentId: "content-bottom", //The content area right below the main content
        pageTitlePrefix: "", //Prepend to title of each page
        submitFilter: ".placeholder", //Don't submit any form elements that match this
        scriptPath: "/Scripts", //Path to download dependent scripts from
        templateDelimiters: ["<%", "%>"], //Delimiters for embedded scripts in templates

        //Progress indicator
        progressId: "progress", //Progress indicator id
        progressText: "One Moment...", //Progress indicator text
        progressCss: "progress", //Progress indicator CSS style

        //Global events
        onPageLoaded: function () { }, //The page just loaded
        onLinkClick: function () { }, //An ajaxified link is just clicked
        onFormSubmit: function () { }, //An ajaxified form is just submitted
        onRequest: function () { }, //A request is just made
        onSuccess: function () { }, //A response is just received
        onBeforeUpdate: function () { }, //Just before content is updated in the DOM
        onAfterUpdate: function () { }, //Just after content is updated in the DOM
        onComplete: function () { }, //The request and updated have been successfully completed
        onError: function () { } //Request resulted in an error

    };

    //Global events
    this.events = {};

    //Custom updaters
    this.updaters = {};

    //Routes
    this.routes = {};

    //Providers
    this.providers = {};

    /********* Public Methods *********/

    //Initialize the page and config settings
    this.init = function (config) {

        //Combine default config with provided
        $.extend(Sync.config, config);

        //Add providers to the core object
        //So "Sync.provider.call" rather than "Sync.providers.provider.call"
        $.extend(Sync, Sync.providers);

        //Content area
        var content = $(Sync.config.contentSelector);

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
            else request(hash);
        }

        //Hash change - Back button support
        $(window).hashchange(function () {
            var hash = location.hash.substr(1);
            //If hash is not current address and isn't prefixed with "!", then make request
            if (hash.charAt(0) != "!" && $(window).data("_updater_address") != hash) {
                if (hash == "") hash = "/";
                request(hash);
            }
        });

        //Attach events to body
        initView("body");

        //Create progress indicator
        $("body").append("<div id=\"" + this.config.progressId + "\" class=\"" + this.config.progressCss + "\">" + this.config.progressText + "</div>");

    };

    //Request
    this.request = function (url, sender, formData) {

        //Reload page with hash value
        if (url == "#" || url.charAt(0) == "~") return;

        //Convert sender to jquery
        sender = $(sender);

        //On request event
        config.onRequest(url, sender, formData);

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
        toggleProgress(true);

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
                if ((/html/i).test(contentType)) handleHtml(result, sender, url);

                //JSON Response
                else if ((/json/i).test(contentType)) handleJson(result, sender, url);

                //Hide progress
                toggleProgress(false);

                //Enable sender
                toggleSender(sender, true);

                //On complete
                config.onComplete();

            }, //End Success event

            //Error event
            error: function (xhr, status, error) {

                //Enable sender
                toggleSender(sender, true);

                //Hide progress
                toggleProgress(false);

                //Call error event
                config.onError(error);
            }

        }); //End begin request

    };

    //Redirect
    this.redirect = function (url) {
        toggleProgress(true);
        window.location = url;
    };

    //Render a template for an object
    var templates = {};
    this.render = function (template, model) {
        //Check cache for template function
        var func = templates[template];
        //Check 
        if (!func) {
            //Get template from storage
            var str = storage.get(template);
            //Template delimiters
            var left = config.templateDelimiters[0];
            var right = config.templateDelimiters[1];
            //Fix html encoding
            str = str.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
            //Parse template
            str = str
                .replace(/[\r\t\n]/g, " ")
                .split(left).join("\t")
                .replace(new RegExp("((^|" + right + ")[^\t]*)'", "g"), "$1\r")
                .replace(new RegExp("\t=(.*?)" + right, "g"), "',$1,'")
                .split("\t").join("');")
                .split(right).join("p.push('")
                .split("\r").join("\\'");
            //Create template function
            var strFunc = "var p=[],print=function(){p.push.apply(p,arguments);};p.push('" + str + "');return p.join('');";
            func = new Function(strFunc);
            templates[template] = func;
        }
        return func.call(model);
    };

    //Render templates for an array
    this.renderAll = function (template, models) {
        var html = "";
        $(models).each(function () {
            html += render(template, this);
        });
        return html;
    };

    //Load dependent scripts
    this.loadScripts = function (scripts) {
        $(scripts).each(function () {
            var src = $.trim(this);
            //Append 'scriptPath' setting if available
            var path = config.scriptPath;
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
    };

    //Show/Hide progress
    this.toggleProgress = function (show) {

        var progress = $("#" + config.progressId);

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

    };
    
    //Close element
    function closeElement(type, selector) {

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

    }
    
    //Must return for static access
    return this;

    /********* Private Methods *********/

    //Handle html update
    function handleHtml(result, sender, url) {

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
        loadScripts(scripts);

        //Store any client templates
        $(result).filter("[data-template]").each(function () {
            storage.store(this.getAttribute("data-template"), this.outerHTML);
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
            if (meta.closeUpdate) close("update", meta.closeUpdate);
            if (meta.closeWindow) close("window", meta.closeWindow);
            if (meta.closeRow) close("row", meta.closeRow);
            if (meta.closeParent) close("parent", meta.closeParent);

            //On before update
            config.onBeforeUpdate(update, meta);

            //Hide update
            update.hide();

            //Update element in the DOM
            updateElement(update, meta, sender, url);

            //On after update
            config.onAfterUpdate(update, meta);

            //Show update
            update.show();

            //Events
            initView(update);

        });

        //Run inline scripts
        $(result).filter("script:not([src])").each(function () {
            $.globalEval($(this).html());
        });

    }

    //Handle json update
    function handleJson(result, sender, url) {

        //Check routes to match url with needed template
        $(routes).each(function () {

            //If route matches, then request template
            if (this.regex.test(url)) {

                //Request templates from URL
                if (!storage.exists(this.templateId)) {
                    $.ajax({
                        type: "get",
                        url: this.templateUrl,
                        async: false,
                        success: function (templates) {
                            //Store any client templates
                            $(templates).filter("[data-template]").each(function () {
                               storage.store(this.getAttribute("data-template"), this.outerHTML);
                            });
                        }
                    });
                }

                //Render template with data, convert to jquery then output
                if (storage.exists(this.templateId)) {
                    var update = $(render(this.templateId, result));
                    updateElement(update, update.data(), sender, url);
                }
            }

        });

    }

    //Initialize any events or prerequisites 
    function initView(context) {

        //Scroll
        //TODO: Need to test this
        $("[data-scroll=true]", context).each(function () {
            $(window).scrollTop($(this).offset().top);
        });

        //Link click
        $(config.autoEvents ? "a:not([href=#],[href^=#],[href^=javascript],[href^=mailto],[data-ajax=false],[data-submit])" : "a:[data-ajax=true]", context).each(function () {
            //Get link
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
                //Prevent default
                e.preventDefault();
                //Prevent duplicate requests
                if (preventAction()) return false;
                //Modify link
                if (url[0] == "#") url = "/" + url.substr(1);
                //Update details
                var details = link.attr("data-details");
                if (details != undefined && $("#" + details).length) url += (url.indexOf("?") != -1 ? "&" : "?") + "UpdateDetails=True";
                //Get request
                request(url, this);
                return false;
            });
        });

        //Form submit
        $(config.autoEvents ? "form:not([data-ajax=false])" : "form:[data-ajax=true]", context).unbind("submit").submit(function (e) {
            //Prevent default
            e.preventDefault();
            //Prevent duplicate requests
            if (preventAction()) return false;
            //Get form
            var form = $(this);
            //Return if no ajax
            if (form.attr("data-ajax") == "false") return;
            //Ensure unique ids
            form.attr("id", ("form-" + Math.random()).replace(".", ""));
            //Required for TinyMCE
            if (typeof tinyMCE != "undefined") tinyMCE.triggerSave();
            //Serialize form data, exclude filtered items
            var data = form.find(":input").not(config.submitFilter).serialize();
            //Disable form
            toggleSender(form, false);
            //Post request
            request(form.attr("action"), this, data);
            return false;
        });

        //Submit button click
        $(config.autoEvents ? ":submit([data-ajax=false])" : ":submit[data-ajax=true]", context).unbind("click").click(function (e) {
            //Prevent default
            e.preventDefault();
            var form = $(this).parents("form:first");
            //Return if no ajax
            if (form.attr("data-ajax") == "false") return;
            //Submit form
            form.submit();
            return false;
        });

        //Request
        $("[data-request]", context).click(function () {
            request($(this).attr("data-request"), this);
        });

        //Close
        $("[data-close]", context).click(function () {
            closeElement($(this).attr("data-close"), this);
        });

        //Submit on dropdown change
        $("select[data-submit=true]", context).change(function () {
            $(this).parent("form:first").submit();
        });

        //Submit on click
        $("[data-submit=true]:not(select)", context).click(function () {
            $(this).parent("form:first").submit();
        });

        //On click actions
        $("[data-hide]").click(function () {
            $($(this).attr("data-hide")).hide();
        });
        $("[data-show]").click(function () {
            $($(this).attr("data-show")).show();
        });
        $("[data-remove]").click(function () {
            $($(this).attr("data-remove")).remove();
        });
        $("[data-empty]").click(function () {
            $($(this).attr("data-empty")).hide();
        });

        //Autoset focus
        var el = $("[data-focus=true]", context);
        if (el.length > 0) setTimeout(function () { el.first().focus(); }, 100);
        else setTimeout(function () { $(":input:first:not([data-focus=false])", context).focus(); }, 100);

        //Load dependent scripts
        $(context).find("[data-load]").andSelf().filter("[data-load]").each(function () {
            var scripts = this.getAttribute("data-load").split(",");
            loadScripts(scripts);
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
    }

    //Update html element
    function updateElement(element, meta, sender, url) {

        //Ensure id
        var id = element.attr("id");
        if (id == "" || id == undefined) {
            id = ("el-" + Math.random()).replace(".", "");
            element.attr("id", id);
        }

        //Match update type by lowercase
        meta.update = meta.update.toLowerCase();

        //Check custom updates
        for (var updater in updaters) {
            if (updater.toLowerCase() == meta.update) {
                updaters[updater](element, meta, sender, url);
                return;
            }
        }

        //Check standard updates
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
                $(config.contentSelector).empty().append(element);
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
                if ($(config.contentSelector).children().length == 0) content.html(element);
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
                            element.removeAttr("id");
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
                    element.dialog(params);
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
                if (table.find("#" + id).length) table.find("#" + id).replaceWith(element);
                //Add new row
                else {
                    var rows = table.find("tbody > tr:not(:has(th))");
                    if (meta.position == "bottom") rows.last().after(element);
                    else rows.first().before(element);
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
                $("#" + id).replaceWith(element);
                break;

            // Insert                                                                                                                                                                                                                                                                                                                                   
            /*
            *   target: selector
            */ 
            case "insert":
                var target = $(meta.target);
                target.html(element);
                break;

            // Prepend                                                                                                                                                                                                                          
            /*
            *   target: selector
            */ 
            case "prepend":
                var existing = $("#" + id);
                if (existing.length) existing.replaceWith(element);
                else $(meta.target).prepend(element);
                break;

            // Append                                                                                                                                                                                                                           
            /*
            *   target: selector
            */ 
            case "append":
                var existing = $("#" + id);
                if (existing.length) existing.replaceWith(element);
                else $(meta.target).append(element);
                break;

            //Top                                                                                                                                                                                                                                                                                             
            case "top":
                var topContent = $("#" + config.topContentId);
                topContent.empty().prepend(element);
                break;

            //Bottom                                                                                                                                                                                                                                                                                              
            case "bottom":
                var bottomContent = $("#" + config.bottomContentId);
                bottomContent.empty().prepend(element);
                break;
        }

    }

    //Disable/Enable sender
    function toggleSender(sender, enabled) {
        //Form
        if ($(sender).is("form")) {
            if (enabled) sender.find("input,textarea,select,button").removeAttr("disabled", "disabled");
            else sender.find("input,textarea,select,button,:password").attr("disabled", "disabled");
        }
        //TODO: Disable other sender types
    }

    //Prevent a user action for .7 seconds
    //Prevents user from making duplicate requests
    var holdAction;
    function preventAction() {
        if (holdAction != undefined) return true;
        else {
            holdAction = {};
            setTimeout(function () { holdAction = undefined; }, 700);
        }
        return false;
    }

})();


/*
*   jQuery hashchange event - v1.3 - 7/21/2010
*   http://benalman.com/projects/jquery-hashchange-plugin/
*
*   Copyright (c) 2010 Ben Alman
*   Dual licensed under the MIT and GPL licenses.
*   http://benalman.com/about/license/
*/
(function (j, o, r) { var q = "hashchange", l = document, n, m = j.event.special, k = l.documentMode, p = "on" + q in o && (k === r || k > 7); function s(a) { a = a || location.href; return "#" + a.replace(/^[^#]*#?(.*)$/, "$1") } j.fn[q] = function (a) { return a ? this.bind(q, a) : this.trigger(q) }; j.fn[q].delay = 50; m[q] = j.extend(m[q], { setup: function () { if (p) { return false } j(n.start) }, teardown: function () { if (p) { return false } j(n.stop) } }); n = (function () { var d = {}, e, a = s(), c = function (h) { return h }, b = c, f = c; d.start = function () { e || g() }; d.stop = function () { e && clearTimeout(e); e = r }; function g() { var h = s(), i = f(a); if (h !== a) { b(a = h, i); j(o).trigger(q) } else { if (i !== a) { location.href = location.href.replace(/#.*/, "") + i } } e = setTimeout(g, j.fn[q].delay) } j.browser.msie && !p && (function () { var i, h; d.start = function () { if (!i) { h = j.fn[q].src; h = h && h + s(); i = j('<iframe tabindex="-1" title="empty"/>').hide().one("load", function () { h || b(s()); g() }).attr("src", h || "javascript:0").insertAfter("body")[0].contentWindow; l.onpropertychange = function () { try { if (event.propertyName === "title") { i.document.title = l.title } } catch (t) { } } } }; d.stop = c; f = function () { return s(i.location.href) }; b = function (w, z) { var x = i.document, y = j.fn[q].domain; if (w !== z) { x.title = l.title; x.open(); y && x.write('<script>document.domain="' + y + '"<\/script>'); x.close(); i.location.hash = w } } })(); return d })() })(jQuery, this);