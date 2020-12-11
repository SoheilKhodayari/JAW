
SUGAR.util = function() {

        return {

            functionOne: function(){},
            
            getAdditionalDetails: function(bean, id, spanId, show_buttons) {
                if (typeof show_buttons == "undefined") show_buttons = false;
                var el = '#' + spanId;
                go = function() {

                    url = 'index.php?to_pdf=1&module=Home&action=AdditionalDetailsRetrieve&bean=' + bean + '&id=' + id;
                    SUGAR.util.additionalDetailsCalls[id] = YAHOO.util.Connect.asyncRequest('GET', url, {
                        success: success,
                        failure: success
                    });
                }
                SUGAR.util.additionalDetailsRpcCall = window.setTimeout('go()', 250);
            }

        }
}

SUGAR.util.getAdditionalDetails('Accounts', id, 'adspan_' + id);

