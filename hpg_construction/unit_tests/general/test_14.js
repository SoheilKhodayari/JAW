
var my_var = 'b2';
var global_scope = my_var;
var module = 'Home';

function func(a1, a2){

    var req = YAHOO.util.Connect.asyncRequest('GET', 'index.php?to_pdf=1&module=' + module + '&action=DynamicAction&DynamicAction=configureDashlet&id=' + a1 + a2);
}

func('b1', global_scope)