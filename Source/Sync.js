
/*
*   Sync JS - v 0.9.1.58
*   This file contains the core functionality
*   Dependencies: HashChange plugin
*/
(function (sync) {

    /********* Private Fields *********/

    var config, //Local access for config
        templates = {}, //Cached template rendering functions
        currentUrl, //URL was just changed to this value
        clickHold; //Prevents double clicks

    /********* Settings *********/

    //Configuration
    config = {

        //General 
        autoEvents: true, //Automatically hijax every link and form
        autoCorrectLinks: true, //Change standard URL's to ajax (#) URL's
        contentSelector: "[data-content=true]:first", //The main content area where content is rendered
        pageTitlePrefix: "", //Prepend to title of each page
        submitFilter: ".placeholder", //Don't submit any form elements that match this
        scriptPath: "/Scripts", //Path to download dependent scripts from
        templateDelimiters: ["<%", "%>"], //Delimiters for embedded scripts in templates

        //Global events
        onPageLoad: function () { }, //The page just loaded
        onLinkClick: function () { }, //An ajaxified link is just clicked
        onFormSubmit: function () { }, //An ajaxified form is just submitted
        onRequest: function () { }, //A request is just made
        onSuccess: function () { }, //A response is just received
        onBeforeUpdate: function () { }, //Just before content is updated in the DOM
        onAfterUpdate: function () { }, //Just after content is updated in the DOM
        onComplete: function () { }, //The request and updated have been successfully completed
        onError: function () { } //Request resulted in an error

    };
    sync.config = config;

    //Global events
    sync.events = {};

    //Custom updaters
    sync.updaters = {};

    //Routes
    sync.routes = {};

    //Providers
    sync.providers = {};

    /********* Page Load *********/

    $(function () {

        //Add providers to the core object
        //So "Sync.provider.call" rather than "Sync.providers.provider.call"
        $.extend(sync, sync.providers);

        //Add page title prefix
        var title = document.title;
        var prefix = config.pageTitlePrefix;
        if (prefix && title.slice(0, prefix.length) != prefix) document.title = prefix + document.title;

        //Change standard URL to Ajax URL
        if (config.autoCorrectLinks) {
            var path = location.pathname;
            if (path != "/") {
                $(config.contentSelector).hide();
                if (path.charAt(0) == "/") path = path.substr(1);
                location.replace("/#" + path + location.search);
            }
        }

        //Handle initial hash value
        var hash = location.hash.substr(1);
        if (hash.length > 1) {
            //Empty content area
            $(config.contentSelector).empty();
            //If url has "!" remove it, it prevents request from being made
            //Remove it on the plugin initialization, page was just reloaded
            if (hash.charAt(0) == "!") location.hash = hash.substr(1);
            //Make request
            else sync.request(hash);
        }

        //Hash change - Back button support
        $(window).hashchange(function () {
            var hash = location.hash.substr(1);
            //If hash is not current address and isn't prefixed with "!", then make request
            if (hash.charAt(0) != "!" && currentUrl != hash) {
                if (hash == "") hash = "/";
                sync.request(hash);
            }
        });

        //Attach events to body
        initView("body");

        //Page load event
        config.onPageLoad();

    });

    /********* Public Methods *********/

    //Initialize the page and config settings
    sync.init = function (config) {

        //Combine default config with provided
        $.extend(sync.config, config);

    };

    //Request
    sync.request = function (url, sender, formData) {

        //Reload page with hash value
        if (url == "#" || url.charAt(0) == "~") return;

        //Convert sender to jquery
        sender = $(sender);

        //On request event
        config.onRequest(url, sender, formData);

        //Confirm request
        if (!confirmAction(sender)) return false;

        //Remove host header & hash
        url = url.replace(/(http|https):\/\/[a-z0-9-_.:]+/i, "").replace(/#/, "");

        //Show loading indicator
        sync.loading.show();

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
                if (method == "POST") sync.window.close(sender);

                //Get return type (HTML, JSON, etc)
                var contentType = (xhr.getResponseHeader("content-type") || "").toLowerCase();

                //HTML response
                if ((/html/i).test(contentType)) handleHTML(result, sender, url);

                //JSON Response
                else if ((/json/i).test(contentType)) handleJSON(result, sender, url);

                //Hide progress
                sync.loading.hide();

                //Enable sender
                toggleSender(sender, true);

                //Check for removed content dependencies
                $("[data-dependent]").each(function () {
                    var el = $(this);
                    var dependent = $(el.attr("data-dependent"));
                    //Remove element of dependent does not exist
                    if (!dependent.length) el.remove();
                });

                //On complete
                config.onComplete();

            },

            //Error event
            error: function (xhr, status, error) {

                //Enable sender
                toggleSender(sender, true);

                //Hide progress
                sync.loading.hide();

                //Call error event
                config.onError(error);
            }

        });

    };

    //Redirect
    sync.redirect = function (url) {
        sync.loading.show();
        window.location = url;
    };

    //Render a template for an object
    var templates = {};
    sync.render = function (template, model) {
        //Check cache for template function
        var func = templates[template];
        //Check 
        if (!func) {
            //Get template from storage
            var str = sync.storage.get(template);
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
    sync.renderAll = function (template, models) {
        var html = "";
        $(models).each(function () {
            html += sync.render(template, this);
        });
        return html;
    };

    //Load dependent scripts
    sync.loadScripts = function (scripts) {
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

    //Close function
    sync.close = function (type, selector) {

        var el = $(selector);
        if (!el.length) return;

        switch (type.toLowerCase()) {

            //Update                                                                                        
            case "update":
                el.closest("[data-update]").remove();
                break;

            //Window                                                                                        
            case "window":
                sync.window.close(selector);
                break;

            //Row                                                                                        
            case "row":
                el.closest("tr").remove();
                break;

            //Parent                                                                                       
            case "parent":
                el.parent().remove();
                break;

        }

    };

    /********* Private Methods *********/

    //Handle HTML response
    function handleHTML(result, sender, url) {

        //Load script tags 
        var scripts = [];
        $(result).filter("script[src]").each(function () {
            //Store src to request later
            scripts.push(this.getAttribute("src"));
        }).remove();
        sync.loadScripts(scripts);

        //Store templates
        $(result).filter("[data-template]").each(function () {
            sync.storage.store(this.getAttribute("data-template"), this.outerHTML);
        });

        //Update HTML elements
        $(result).filter("[data-update]:not([data-template])").each(function () {

            //jQuery object of the element
            var element = $(this);

            //Read metadata
            var meta = element.data();
            meta.update = meta.update.toLowerCase();

            //Update actions
            if (meta.hide) $(meta.hide).hide();
            if (meta.show) $(meta.show).show();
            if (meta.empty) $(meta.empty).show();
            if (meta.remove) $(meta.remove).show();

            //On before update
            config.onBeforeUpdate(element, meta);

            //Hide update
            element.hide();

            //Update element in the DOM
            updateElement(element, meta, sender, url);

            //On after update
            config.onAfterUpdate(element, meta);

            //Show update
            element.show();

            //Events
            initView(element);

        });

        //Run inline scripts
        $(result).filter("script:not([src])").each(function () {
            $.globalEval($(this).html());
        });
    }

    //Update html element in the DOM
    function updateElement(element, metadata, sender, url) {

        //Ensure id
        var id = element.attr("id");
        if (id == "" || id == undefined) {
            id = ("el-" + Math.random()).replace(".", "");
            element.attr("id", id);
        }

        //Match update type by lowercase
        metadata.update = metadata.update.toLowerCase();

        //Check custom updates
        for (var updater in sync.updaters) {
            if (updater.toLowerCase() == metadata.update) {
                sync.updaters[updater](element, metadata, sender, url);
                return;
            }
        }

        //Check standard updates
        //Content, Window, Replace, Insert, Append, Prepend, After, Before
        switch (metadata.update) {

            //Content                                                                                         
            /*  
            *   title: {string} 
            *   address: {string} 
            */ 
            case "content":
                //Address
                if (metadata.address && metadata.address != "") url = metadata.address;
                if (url.charAt(0) == "/") url = url.substr(1);
                currentUrl = url;
                if (window.location.hash.substr(1) != url) {
                    if (url != "/") {
                        window.location.hash = url;
                    }
                    else window.location.hash = "";
                }
                //Page Title
                if (metadata.title) document.title = config.pageTitlePrefix + metadata.title;
                //Content
                $(config.contentSelector).empty().append(element);
                //Scroll to top by default
                if (!metadata.scroll) $(window).scrollTop(0);
                break;

            //Window                                                                                                                                                                                                                                                                                                                                                                                                                        
            case "window":
                sync.window.create(id, element, metadata);
                break;

            //Replace                                                                                                                                                                                                                                                                                                                                                                               
            case "replace":
                $("#" + id).replaceWith(element);
                break;

            //Insert                                                                                                                                                                                                                                                                                                                                                                               
            /*
            *   target: {selector}
            */ 
            case "insert":
                var target = $(metadata.target);
                target.html(element);
                break;

            //Prepend                                                                                                                                                                                                                                                                      
            /*
            *   target: {selector}
            */ 
            case "prepend":
                var existing = $("#" + id);
                if (existing.length) existing.replaceWith(element);
                else $(metadata.target).prepend(element);
                break;

            //Append                                                                                                                                                                                                                                                                       
            /*
            *   target: {selector}
            */ 
            case "append":
                var existing = $("#" + id);
                if (existing.length) existing.replaceWith(element);
                else $(metadata.target).append(element);
                break;

            //After                                                                                                                                                                                                                                                                                                                                                                                
            /*
            *   target: {selector}
            */ 
            case "after":
                var target = $(metadata.target);
                target.after(element);
                break;

            //Before                                                                                                                                                                                                                                                                                                                                                                                
            /*
            *   target: {selector}
            */ 
            case "before":
                var target = $(metadata.target);
                target.before(element);
                break;
        }
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
                if (preventDoubleClick()) return false;
                //Link click event
                config.onLinkClick(link);
                //Modify link
                if (url[0] == "#") url = "/" + url.substr(1);
                //Update details
                //TODO: Remove this
                var details = link.attr("data-details");
                if (details != undefined && $("#" + details).length) url += (url.indexOf("?") != -1 ? "&" : "?") + "UpdateDetails=True";
                //Get request
                sync.request(url, this);
                return false;
            });
        });

        //Form submit
        $(config.autoEvents ? "form:not([data-ajax=false])" : "form:[data-ajax=true]", context).unbind("submit").submit(function (e) {
            //Prevent default
            e.preventDefault();
            //Prevent duplicate requests
            if (preventDoubleClick()) return false;
            //Get form
            var form = $(this);
            //Return if no ajax
            if (form.attr("data-ajax") == "false") return;
            //Ensure unique ids
            form.attr("id", ("form-" + Math.random()).replace(".", ""));
            //Form submit event
            config.onFormSubmit(form);
            //Serialize form data, exclude filtered items
            var data = form.find(":input").not(config.submitFilter).serialize();
            //Disable form
            toggleSender(form, false);
            //Post request
            sync.request(form.attr("action"), this, data);
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
            sync.request($(this).attr("data-request"), this);
        });

        //Close
        $("[data-close]", context).click(function () {
            sync.close($(this).attr("data-close"), this);
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
            sync.loadScripts(scripts);
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

    //Handle JSON response
    function handleJSON(result, sender, url) {

        //Check routes to match url with needed template
        $(sync.routes).each(function () {

            //If route matches, then request template
            if (this.regex.test(url)) {

                //Request templates from URL
                if (!sync.storage.exists(this.templateId)) {
                    $.ajax({
                        type: "get",
                        url: this.templateUrl,
                        async: false,
                        success: function (templates) {
                            //Store any client templates
                            $(templates).filter("[data-template]").each(function () {
                                sync.storage.store(this.getAttribute("data-template"), this.outerHTML);
                            });
                        }
                    });
                }

                //Render template with data, convert to jquery then output
                if (sync.storage.exists(this.templateId)) {
                    var update = $(sync.render(this.templateId, result));
                    updateElement(update, update.data(), sender, url);
                }
            }

        });

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

    //Prevent a double click for .7 seconds
    //Prevents user from making duplicate requests
    function preventDoubleClick() {
        if (clickHold != undefined) return true;
        else {
            clickHold = {};
            setTimeout(function () { clickHold = undefined; }, 700);
        }
        return false;
    }

    //Confirm
    /*
    *   data-confirm="true"
    *   data-confirm="delete"
    *   data-confirm="Are you sure you want to delete this item?"
    */
    function confirmAction(sender) {
        if (sender) {
            var val = sender.attr("data-confirm");
            if (!val) val = sender.find("submit:first").attr("data-confirm");
            if (val) {
                if (val == "true" && !confirm("Are you sure you want to do this?")) return false;
                if (val.indexOf(" ") == -1 && !confirm("Are you sure you want to " + val + "?")) return false;
                if (val.indexOf(" ") > -1 && !confirm(val)) return false;
            }
        }
        return true;
    }

} (window.Sync = window.Sync || {}));


/*
*   jQuery hashchange event - v1.3 - 7/21/2010
*   http://benalman.com/projects/jquery-hashchange-plugin/
*
*   Copyright (c) 2010 Ben Alman
*   Dual licensed under the MIT and GPL licenses.
*   http://benalman.com/about/license/
*/
(function (i, d, a) { var b = "hashchange", g = document, e, f = i.event.special, h = g.documentMode, c = "on" + b in d && (h === a || h > 7); function t(j) { j = j || location.href; return "#" + j.replace(/^[^#]*#?(.*)$/, "$1") } i.fn[b] = function (j) { return j ? this.bind(b, j) : this.trigger(b) }; i.fn[b].delay = 50; f[b] = i.extend(f[b], { setup: function () { if (c) { return false } i(e.start) }, teardown: function () { if (c) { return false } i(e.stop) } }); e = (function () { var o = {}, n, k = t(), p = function (q) { return q }, j = p, m = p; o.start = function () { n || l() }; o.stop = function () { n && clearTimeout(n); n = a }; function l() { var r = t(), q = m(k); if (r !== k) { j(k = r, q); i(d).trigger(b) } else { if (q !== k) { location.href = location.href.replace(/#.*/, "") + q } } n = setTimeout(l, i.fn[b].delay) } i.browser.msie && !c && (function () { var q, r; o.start = function () { if (!q) { r = i.fn[b].src; r = r && r + t(); q = i('<iframe tabindex="-1" title="empty"/>').hide().one("load", function () { r || j(t()); l() }).attr("src", r || "javascript:0").insertAfter("body")[0].contentWindow; g.onpropertychange = function () { try { if (event.propertyName === "title") { q.document.title = g.title } } catch (s) { } } } }; o.stop = p; m = function () { return t(q.location.href) }; j = function (u, v) { var s = q.document, A = i.fn[b].domain; if (u !== v) { s.title = g.title; s.open(); A && s.write('<script>document.domain="' + A + '"<\/script>'); s.close(); q.location.hash = u } } })(); return o })() })(jQuery, this);