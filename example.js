var hash_fragment = window.location.hash.substr(1);

button = document.querySelector('button');
button.addEventListener('click', async function(e){ 

  var url = hash_fragment;
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': 'xxxxxx',
    },
    body: JSON.stringify({'secret-info': 'yyyyyy'}),
  });

});

button.click();
