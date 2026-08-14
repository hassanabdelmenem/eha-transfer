if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}
caches.keys().then((keyList) => Promise.all(keyList.map((key) => caches.delete(key))));
