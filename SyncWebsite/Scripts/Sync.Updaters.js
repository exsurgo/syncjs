
Sync.updaters = {

    //SubRow
    SubRow: function (element, meta, sender, url) {
        //Replace if exists
        var sub = $("#" + element.id);
        if (sub.length) sub.replaceWith(element);
            //Add new
        else {
            //Get target row, subrow goes after
            var tr = meta.target ? $(meta.target) : $(sender).parents("tr:first");
            //Show in content area if not found
            if (tr.length == 0) $("#" + Sync.config.contentId).html(element).find(".close-button").remove();
                //Add row
            else {
                if (!tr.next().hasClass("subrow")) {
                    var cols = tr.find("> td").length;
                    tr.after("<tr class='subrow'><td colspan='" + cols + "'></td></tr>");
                }
                //Selected row
                $("." + config.rowSelectCss).removeClass("rowselect");
                $(tr).closest("tr").addClass("rowselect");
                //Add update
                var zone = tr.next().find("td:first");
                zone.prepend(element);
                //IE8 Rendering Fix
                if ($.browser.msie && $.browser.version == "8.0") zone.find("table").hide().slideDown(1);
            }
        }
    }

}