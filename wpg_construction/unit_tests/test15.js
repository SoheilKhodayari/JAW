


function f1(a1){}
f1("1");


var f2 = function(a2){}
f2('2');


var lib = { util: { f3: function(a3, a33){}, abc: 12 }, dummy: 13};
lib.util.f3('3', 33);


var obj = { f4: function(a4){} };
obj.f4('4');


obj2.f5.f55 = function(a5){}
obj2.f5.f55('5')


f6 = function(a6){}
f6('6')


instance1.instance2.dict={ k1: { f7: function(a7){}, f8: function(a8){} }, k2: "12", k3: { f9: function(a9){} } }
instance1.instance2.dict.f7('7')
instance1.instance2.dict.f8('8')
instance1.instance2.dict.f9('9')



var alias = obj;
alias.f4('4');


var ii = instance1.instance2.dict;
ii.f7('7');


var d = {}
d.short = lib.util;
d.short.f3('3');