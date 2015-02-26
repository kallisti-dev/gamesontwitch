'use strict'
$(document).ready(function() {
    $(".priority-settings-container").parents("form").submit(function(e) {
        var form = $(e.target);
        var settings = [];
        form.find("select.priority-settings-select").each(function(i, sel) {
            settings.push($(sel).val());
        });
        $("<input />")
            .attr("name", "priority_settings")
            .attr("type", "hidden")
            .attr("value", settings.join(","))
            .appendTo(form)
        ;
        return true;
    });
    
    $("button.priority-settings-add-button").each(function(i, btn) {       
        btn = $(btn);
        var list = btn.parent().find(".priority-settings-list");
        btn.click(function() {
            var newItem = list.children("li").last().clone().appendTo(list);
            newItem.find("label").contents().replaceWith("then sort by ");
            newItem.find("select").val("-1")
        });
    });
    $("button.priority-settings-remove-button").each(function(i, btn) {
        btn = $(btn);
        var list = btn.parent().find(".priority-settings-list");
        btn.click(function() {
            var c = list.children();
            if(c.length > 1) {
                c.last().remove();
            }
        });
        
    });
    
});