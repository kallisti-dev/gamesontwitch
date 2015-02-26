'use strict'
$(document).ready(function() {
    $(".logout").click(function(e) {
        $('<form action="' + urls.logout + '" method="post"/>').submit()
    });
});