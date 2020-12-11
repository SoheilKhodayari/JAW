var SUGAR = {}
initMySugar = function() {
    SUGAR.mySugar = function() {
        var activeTab = activePage;
        var current_user = current_user_id;
        var module = moduleName;
        var charts = new Object();
        if (module == 'Dashboard') {
            cookiePageIndex = current_user + "_activeDashboardPage";
        } else {
            cookiePageIndex = current_user + "_activePage";
        }
        var homepage_dd;
        return {
            onDrag: function(e, id) {
                originalLayout = SUGAR.mySugar.getLayout(true);
            },

            configureDashlet: function(id) {
                ajaxStatus.showStatus(SUGAR.language.get('app_strings', 'LBL_LOADING'));
                fillInConfigureDiv = function(data) {
                    ajaxStatus.hideStatus();
                }
                SUGAR.mySugar.configureDashletId = id;
                var cObj = YAHOO.util.Connect.asyncRequest('GET', 'index.php?to_pdf=1&module=' + module + '&action=DynamicAction&DynamicAction=configureDashlet&id=' + id, {
                    success: fillInConfigureDiv,
                    failure: fillInConfigureDiv
                }, null);
            }
        }
    }
}

var moduleName = 'Home'; 