/**
* jGrowl 1.2.4
*
* Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
* and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
*
* Written by Stan Lemon <stosh1985@gmail.com>
* Last updated: 2009.12.13
*
* jGrowl is a jQuery plugin implementing unobtrusive userland notifications.  These 
* notifications function similarly to the Growl Framework available for
* Mac OS X (http://growl.info).
*
*/
(function($) {

    /** jGrowl Wrapper - Establish a base jGrowl Container for compatibility with older releases. **/
    $.jGrowl = function(m, o) {
        // To maintain compatibility with older version that only supported one instance we'll create the base container.
        if ($('#jGrowl').size() == 0)
            $('<div id="jGrowl"></div>').addClass($.jGrowl.defaults.position).appendTo('body');

        // Create a notification on the container.
        $('#jGrowl').jGrowl(m, o);
    };


    /** Raise jGrowl Notification on a jGrowl Container **/
    $.fn.jGrowl = function(m, o) {
        if ($.isFunction(this.each)) {
            var args = arguments;

            return this.each(function() {
                var self = this;

                /** Create a jGrowl Instance on the Container if it does not exist **/
                if ($(this).data('jGrowl.instance') == undefined) {
                    $(this).data('jGrowl.instance', $.extend(new $.fn.jGrowl(), { notifications: [], element: null, interval: null }));
                    $(this).data('jGrowl.instance').startup(this);
                }

                /** Optionally call jGrowl instance methods, or just raise a normal notification **/
                if ($.isFunction($(this).data('jGrowl.instance')[m])) {
                    $(this).data('jGrowl.instance')[m].apply($(this).data('jGrowl.instance'), $.makeArray(args).slice(1));
                } else {
                    $(this).data('jGrowl.instance').create(m, o);
                }
            });
        };
    };

    $.extend($.fn.jGrowl.prototype, {

        /** Default JGrowl Settings **/
        defaults: {
            pool: 0,
            header: '',
            group: '',
            sticky: false,
            position: 'top-right', // Is this still needed?
            glue: 'after',
            theme: 'default',
            corners: '10px',
            check: 250,
            life: 3000,
            speed: 'normal',
            easing: 'swing',
            closer: true,
            closeTemplate: '&times;',
            closerTemplate: '<div>Close All</div>',
            log: function(e, m, o) { },
            beforeOpen: function(e, m, o) { },
            open: function(e, m, o) { },
            beforeClose: function(e, m, o) { },
            close: function(e, m, o) { },
            animateOpen: {
                opacity: 'show'
            },
            animateClose: {
                opacity: 'hide'
            }
        },

        notifications: [],

        /** jGrowl Container Node **/
        element: null,

        /** Interval Function **/
        interval: null,

        /** Create a Notification **/
        create: function(message, o) {
            var o = $.extend({}, this.defaults, o);

            this.notifications.push({ message: message, options: o });

            o.log.apply(this.element, [this.element, message, o]);
        },

        render: function(notification) {
            var self = this;
            var message = notification.message;
            var o = notification.options;

            var notification = $(
				'<div class="jGrowl-notification ui-state-highlight ui-corner-all' +
				((o.group != undefined && o.group != '') ? ' ' + o.group : '') + '">' +
				'<div class="close">' + o.closeTemplate + '</div>' +
				'<div class="header">' + o.header + '</div>' +
				'<div class="message">' + message + '</div></div>'
			).data("jGrowl", o).addClass(o.theme).children('div.close').bind("click.jGrowl", function() {
			    $(this).parent().trigger('jGrowl.close');
			}).parent();


            /** Notification Actions **/
            $(notification).bind("mouseover.jGrowl", function() {
                $('div.jGrowl-notification', self.element).data("jGrowl.pause", true);
            }).bind("mouseout.jGrowl", function() {
                $('div.jGrowl-notification', self.element).data("jGrowl.pause", false);
            }).bind('jGrowl.beforeOpen', function() {
                if (o.beforeOpen.apply(notification, [notification, message, o, self.element]) != false) {
                    $(this).trigger('jGrowl.open');
                }
            }).bind('jGrowl.open', function() {
                if (o.open.apply(notification, [notification, message, o, self.element]) != false) {
                    if (o.glue == 'after') {
                        $('div.jGrowl-notification:last', self.element).after(notification);
                    } else {
                        $('div.jGrowl-notification:first', self.element).before(notification);
                    }

                    $(this).animate(o.animateOpen, o.speed, o.easing, function() {
                        // Fixes some anti-aliasing issues with IE filters.
                        if ($.browser.msie && (parseInt($(this).css('opacity'), 10) === 1 || parseInt($(this).css('opacity'), 10) === 0))
                            this.style.removeAttribute('filter');

                        $(this).data("jGrowl").created = new Date();
                    });
                }
            }).bind('jGrowl.beforeClose', function() {
                if (o.beforeClose.apply(notification, [notification, message, o, self.element]) != false)
                    $(this).trigger('jGrowl.close');
            }).bind('jGrowl.close', function() {
                // Pause the notification, lest during the course of animation another close event gets called.
                $(this).data('jGrowl.pause', true);
                $(this).animate(o.animateClose, o.speed, o.easing, function() {
                    $(this).remove();
                    var close = o.close.apply(notification, [notification, message, o, self.element]);

                    if ($.isFunction(close))
                        close.apply(notification, [notification, message, o, self.element]);
                });
            }).trigger('jGrowl.beforeOpen');

            /** Optional Corners Plugin **/
            if ($.fn.corner != undefined) $(notification).corner(o.corners);

            /** Add a Global Closer if more than one notification exists **/
            if ($('div.jGrowl-notification:parent', self.element).size() > 1 &&
				 $('div.jGrowl-closer', self.element).size() == 0 && this.defaults.closer != false) {
                $(this.defaults.closerTemplate).addClass('jGrowl-closer ui-state-highlight ui-corner-all').addClass(this.defaults.theme)
					.appendTo(self.element).animate(this.defaults.animateOpen, this.defaults.speed, this.defaults.easing)
					.bind("click.jGrowl", function() {
					    $(this).siblings().children('div.close').trigger("click.jGrowl");

					    if ($.isFunction(self.defaults.closer)) {
					        self.defaults.closer.apply($(this).parent()[0], [$(this).parent()[0]]);
					    }
					});
            };
        },

        /** Update the jGrowl Container, removing old jGrowl notifications **/
        update: function() {
            $(this.element).find('div.jGrowl-notification:parent').each(function() {
                if ($(this).data("jGrowl") != undefined && $(this).data("jGrowl").created != undefined &&
					 ($(this).data("jGrowl").created.getTime() + $(this).data("jGrowl").life) < (new Date()).getTime() &&
					 $(this).data("jGrowl").sticky != true &&
					 ($(this).data("jGrowl.pause") == undefined || $(this).data("jGrowl.pause") != true)) {

                    // Pause the notification, lest during the course of animation another close event gets called.
                    $(this).trigger('jGrowl.beforeClose');
                }
            });

            if (this.notifications.length > 0 &&
				 (this.defaults.pool == 0 || $(this.element).find('div.jGrowl-notification:parent').size() < this.defaults.pool))
                this.render(this.notifications.shift());

            if ($(this.element).find('div.jGrowl-notification:parent').size() < 2) {
                $(this.element).find('div.jGrowl-closer').animate(this.defaults.animateClose, this.defaults.speed, this.defaults.easing, function() {
                    $(this).remove();
                });
            }
        },

        /** Setup the jGrowl Notification Container **/
        startup: function(e) {
            this.element = $(e).addClass('jGrowl').append('<div class="jGrowl-notification"></div>');
            this.interval = setInterval(function() {
                $(e).data('jGrowl.instance').update();
            }, this.defaults.check);

            if ($.browser.msie && parseInt($.browser.version) < 7 && !window["XMLHttpRequest"]) {
                $(this.element).addClass('ie6');
            }
        },

        /** Shutdown jGrowl, removing it and clearing the interval **/
        shutdown: function() {
            $(this.element).removeClass('jGrowl').find('div.jGrowl-notification').remove();
            clearInterval(this.interval);
        },

        close: function() {
            $(this.element).find('div.jGrowl-notification').each(function() {
                $(this).trigger('jGrowl.beforeClose');
            });
        }
    });

    /** Reference the Defaults Object for compatibility with older versions of jGrowl **/
    $.jGrowl.defaults = $.fn.jGrowl.prototype.defaults;

})(jQuery);