    var newForm = document.createElement('form');
    newForm.method = 'post';
    var moduleInput = document.createElement('input');
    moduleInput.name = 'module';
    newForm.appendChild(moduleInput);

    YAHOO.util.connect.setForm(newForm);