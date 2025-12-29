function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  async function subscribeUserToPush(registration) {
    // Only subscribe if student is logged in
    if (!window.CURRENT_USER_LOGGED_IN) {
      return;
    }
  
    if (!("PushManager" in window) || !("Notification" in window)) {
      return;
    }
  
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return;
    }
  
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      return;
    }
  
    const vapidKey = window.VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      return;
    }
  
    const convertedKey = urlBase64ToUint8Array(vapidKey);
  
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });
  
    await fetch("/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });
  }
  
  window.addEventListener("load", async () => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
  
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered:", registration);
  
      // Try to subscribe (will only actually subscribe if user is logged in)
      subscribeUserToPush(registration).catch((err) =>
        console.log("Subscribe error:", err)
      );
    } catch (err) {
      console.log("SW registration failed:", err);
    }
  });
  