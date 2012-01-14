
/*
*   Custom Updaters
*   Add any custom update types here.  The update type (data-update="{name}") should match the name of the function.
*   The function signature should be as follows...  functionName: function(element, metadata, sender)
*/
Sync.updaters = {

    /*
    *   Row - replaces or adds a row
    *   target: {selector}
    */
    row: function (element, metadata, sender) {
        //Get id
        var id = $(element).attr("id");
        //Get self or first table
        if (!metadata.target) metadata.target = Sync.config.contentSelector;
        var table = $(metadata.target);
        if (table[0].tagName != "TABLE") table = $("table:first");
        //Add tbody
        if (!table.find("tbody").length) table.append("<tbody></tbody>");
        //Replace existing row
        if (table.find("#" + id).length) table.find("#" + id).replaceWith(element);
        //Add new row
        else {
            var rows = table.find("tbody > tr:not(:has(th))");
            if (metadata.position == "bottom") rows.last().after(element);
            else rows.first().before(element);
        }
        //Select row
        $(".row-select").removeClass("row-select");
        var row = table.find("#" + id);
        row.addClass("row-select");
        //Hide empty section
        table.next(".empty:first").hide();
    },

    /*
    *   SubRow - adds a row in a table under another row
    *   "data-close=true" for close event
    *   target: {selector}
    */
    subrow: function (element, metadata, sender) {
        //Replace if exists
        var sub = $("#" + element.attr("id"));
        if (sub.length) sub.replaceWith(element);
        //Add new
        else {
            //Get target row, subrow goes after
            var tr = metadata.target ? $(metadata.target) : $(sender).parents("tr:first");
            //Show in content area if not found
            if (tr.length == 0) $(Sync.config.contentSelector).html(element).find(".close-button").remove();
            //Add row
            else {
                if (!tr.next().hasClass("subrow")) {
                    var cols = tr.find("> td").length;
                    tr.after("<tr class='subrow'><td colspan='" + cols + "'></td></tr>");
                }
                //Selected row
                $(".row-select").removeClass("row-select");
                $(tr).closest("tr").addClass("row-select");
                //Add update
                var zone = tr.next().find("td:first");
                zone.prepend(element);
                //IE8 Rendering Fix
                if ($.browser.msie && $.browser.version == "8.0") zone.find("table").hide().slideDown(1);
            }
        }
        //Close event
        element.find("[data-close=true]").click(function () {
            var el = $(this);
            var subrow = el.closest(".subrow");
            el.closest("[data-update]").remove();
            if (!subrow.find("td:first > *:first").length) subrow.remove();
        });
    }

}