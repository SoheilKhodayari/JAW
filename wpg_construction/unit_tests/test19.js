function toggleMore(spanId, img_id, module, action, params) {
    toggle_more_go = function() {

        url = 'index.php?module=' + module + '&action=' + action + '&' + params;
        SUGAR.util.additionalDetailsCalls[spanId] = YAHOO.util.Connect.asyncRequest('GET', url, {
            success: success,
            failure: success
        });
        return false;
    }

    // sugar.obj = window.setTimeout('toggle_more_go()', 250);
    var sugar =  window.setTimeout('toggle_more_go()', 250), b=0;
    // toggle_more_go()
}