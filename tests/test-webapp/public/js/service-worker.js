// Register event listener for the 'push' event.
self.addEventListener('push', function(event) {
    // Keep the service worker alive until the notification is created.
    event.waitUntil(
      self.registration.showNotification('Notification', {
        body: 'This is a push message!',
      })
    );
  });

self.addEventListener('install', event => {
  event.waitUntil(console.log("Service worker installing"));
});


self.addEventListener('activate', event => {
    event.waitUntil(
        console.log("Service worker active!")
    );
});

