
/*
*   Sync JS - v 0.9.1.64
*   This file contains the core functionality
*   Dependencies: jQuery 1.5+, HashChange plugin 1.3+ (included)
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
        metadata: { update: "content" }, //Default global metadata
        autoEvents: true, //Automatically hijax every link and form
        autoCorrectLinks: true, //Change standard URL's to ajax (#) URL's
        contentSelector: "[data-content=true]:first", //The main content area where content is rendered
        pageTitlePrefix: "", //Prepend to title of each page
        submitFilter: ".placeholder", //Don't submit any form elements that match this
        scriptPath: "/Scripts", //Path to download dependent scripts from
        templateDelimiters: ["<%", "%>"], //Delimiters for embedded scripts in templates
        closeWindowOnPost: true //Close the form window automatically after successful post
    };
    sync.config = config;

    //Global events
    var events = {};
    sync.events = events;

    //Custom updaters
    sync.updaters = {};

    //Routes
    sync.routes = [];

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

        //Document ready
        events.ready();

        //Attach events to body
        initHTML("body");
        events.init("body");

    });

    /********* Public Methods *********/

    //Initialize the page and config settings
    sync.init = function (obj) {

        //Iterate from all object properties
        for (var prop in obj) {
            //Add functions to Sync.events
            if (typeof obj[prop] == "function") events[prop] = obj[prop];
            //Add all other properties to Sync.config
            else config[prop] = obj[prop];
        }

    };

    //Request
    sync.request = function (url, postData, sender) {

        //Reload page with hash value
        if (url == "#" || url.charAt(0) == "~") return;

        //Convert sender to jquery
        sender = $(sender);

        //Get metadata from route and sender
        //Ensure that data objects are not undefined
        var routeData = getRouteData(url) || {};
        var senderData = sender.data() || {};
        //Override in order: sender -> route -> global
        var metadata = $.extend({}, config.metadata, routeData, senderData);
		
        //Create params object
		var params = { 
			url: url,
			postData: postData,			
			isPost: postData != undefined,			
			sender: sender,			
			metadata: metadata,
			routeData: routeData,
			senderData: senderData
		};
		
		//Request event
        events.request.apply(sender, params);
		if (metadata.request) callFunction(metadata.request, sender, params);
		
        //Confirm request
        if (!confirmAction(sender)) return false;

        //Remove host header & hash
        url = url.replace(/(http|https):\/\/[a-z0-9-_.:]+/i, "").replace(/#/, "");

        //Show loading indicator
        sync.loading.show();

        //Serialize post data
        if (postData && typeof postData != "string") postData = $.param(postData);

        //Begin request
        var method = postData ? "POST" : "GET";
        $.ajax({

            //Parameters
            type: method,
            url: url,
            data: postData,
            cache: false,

            //Request was successful
            success: function (result, status, xhr) {
                
				//Get return type (HTML, JSON, etc)
                var contentType = (xhr.getResponseHeader("content-type") || "").toLowerCase();
				
				//Success event
				params = $.extend(params, {
					result: result,
					status: status,
					xhr: xhr,
					contentType: contentType
				});
				events.success.apply(result, params);
				if (metadata.success) callFunction(metadata.success, result, params);
				
                //Close window on post
                if (method == "POST" && config.closeWindowOnPost) sync.window.close(sender);

                //HTML response
                if ((/html/i).test(contentType)) handleHTML(params);

                //JSON Response
                else if ((/json/i).test(contentType)) handleJSON(params);

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

                //Complete event
                events.complete.apply(result, params);
				if (metadata.complete) callFunction(metadata.complete, result, params);

            },

            //Error event
            error: function (xhr, status, error) {

                //Enable sender
                toggleSender(sender, true);

                //Hide progress
                sync.loading.hide();

				//Params
				params = $.extend(params, {
					error: error,
					status: status,
					xhr: xhr
				});
				
                //Error event
				events.error.apply(error, params);
				if (metadata.error) callFunction(metadata.error, error, params);
            }

        });

    };

    //Redirect
    sync.redirect = function (url) {
        sync.loading.show();
        window.location = url;
    };

    //Load dependent scripts
    sync.load = function (scripts) {
        //If script, split by comma and convert to array
        if (typeof (scripts) == "string") scripts = scripts.split(",");
        //Load each script
        //TODO: Allow multiple scripts to be requested at once
        $(scripts).each(function () {
            //Trim
            var src = $.trim(this);
            //Append 'scriptPath' setting if available
            var path = config.scriptPath;
            if (path) {
                if (!path.match(/\/$/)) path += "/";
                src = path + src;
            }
            //Load script via ajax
            $.ajax({
                type: "GET",
                url: src,
                dataType: "script",
                cache: true, //Enable caching
                async: false //Can't be async, must be loaded first
            });
        });
    };

    /********* Provider Methods *********/

    //Render a template for an object
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

    /********* Private Methods *********/

    //Handle HTML response
    function handleHTML(params) {

		//Locals
		var result = params.result,
            scripts = [],
	
        //Load script tags 
        scripts = [];
        $(result).filter("script[src]").each(function () {
            //Store src to request later
            scripts.push(this.getAttribute("src"));
        }).remove();
        sync.load(scripts);

        //Store templates
        $(result).filter("[data-template]").each(function () {
            sync.storage.store(this.getAttribute("data-template"), this.outerHTML);
        });

        //Update each HTML element
        $(result).filter("[data-update]:not([data-template])").each(function () {
            updateElement(this, params);
        });
		
        //Run inline scripts
        $(result).filter("script:not([src])").each(function () {
            $.globalEval($(this).html());
        });
    }

    //Update an html element in the DOM
    function updateElement(element, params) {
		
		//Ensure element has id
        id = element.attr("id");
        if (id == "" || id == undefined) {
            id = ("el-" + Math.random()).replace(".", "");
            element.attr("id", id);
        }
	
		//Get metadata from update
		var updateData = element.data();
		updateData.update = updateData.update.toLowerCase();
		
		//Combine metadata
		//Override in order: sender -> update -> route -> global
		var metadata = $.extend({}, config.metadata, routeData, updateData, senderData);	
		
		//Event params - Use a new object for updating/updated events
		var updateParams = $.extend({}, params, {
			metadata: metadata,
			updateData: dataData,
			updateId: id,
			element: element
		});
		
		//Updating events
		events.updating.apply(element, updateParams);
		if (metadata.updating) callFunction(metadata.updating, element, updateParams);
		
		//Hide update
		element.hide();	
        
		//Match update type by lowercase
		metadata.update = metadata.update.toLowerCase();

        //Check custom updates
        for (var updater in sync.updaters) {
            if (updater.toLowerCase() == metadata.update) {
                //Run custom updater
                sync.updaters[updater](element, metadata, params.sender, url);
                //Initialize the view
                initHTML(element);
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
                var url = params.url;
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

		//Updated events
		events.updated.apply(element, updateParams);
		if (metadata.updated) callFunction(metadata.updated, element, updateParams);

		//Metadata actions
		if (metadata.hide) $(metadata.hide).hide();
		if (metadata.show) $(metadata.show).show();
		if (metadata.empty) $(metadata.empty).empty();
		if (metadata.remove) $(metadata.remove).remove();

		//Show update
		element.show();
		
        //Initialize the view
        initHTML(element);
        
		//Init event
		events.init.apply(element, updateParams);
		if (metadata.init) callFunction(metadata.init, element, updateParams);
    }

    //Initialize any events or prerequisites 
    function initHTML(context) {

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
                //Modify link
                if (url[0] == "#") url = "/" + url.substr(1);
                //Update details
                //TODO: Remove this
                var details = link.attr("data-details");
                if (details != undefined && $("#" + details).length) url += (url.indexOf("?") != -1 ? "&" : "?") + "UpdateDetails=True";
                //Get request
                sync.request(url, null, this);
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
            //Convert fields to array, exclude filtered items
            //Array is in format [{name: "...", value: ".."},{name: "...", value: "..."}]
            var postData = form.find(":input").not(config.submitFilter).serializeArray();
            //Disable form
            toggleSender(form, false);
            //Post request
            sync.request(form.attr("action"), postData, this);
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
        $("[data-close=true]", context).click(function () {
            $(this).closest("[data-update]").remove();
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
            sync.load(this.getAttribute("data-load"));
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
    function handleJSON(params) {

        //Check routes to match url with needed template
        $(sync.routes).each(function () {

            //If route matches, then request template
            if (this.route.test(params.url)) {

                //Request templates from URL
                if (!sync.storage.exists(this.templateId)) {
                    $.ajax({
                        type: "get",
                        url: this.templateURL,
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
                    var element = $(sync.render(this.templateId, params.result));
                    updateElement(element, params);
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

    //Call a global or namespaced function by string
    function callFunction(name, context, args) {
        if (name != undefined && name != "" && name != null) {
            var parts = name.split("."),
                obj = window;
            for (var i = 0; i < parts.length; ++i) {
                obj = obj[parts[i].trim()];
            }
            //Run method, use context for "this" value
            obj.apply(context, args);
        }
    }

    //Get route metadata
    function getRouteData(url) {
        $(sync.routes).each(function () {
            if (this.route.test(url)) return this;
        });
        //Return empty object to prevent undefined error
        return undefined;
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