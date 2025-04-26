// Background service worker (or script)

browser.runtime.onMessage.addListener((request, sender) => { // Use browser.runtime
  if (request.action === "openEditor" && request.data) {
    console.log("Background: Received flashcard data, preparing to open editor.");

    // Store data temporarily using browser.storage.local (returns a Promise)
    return browser.storage.local.set({ flashcardData: request.data })
      .then(() => {
        console.log("Background: Data saved to local storage.");
        // Open the editor.html page in a new tab (returns a Promise)
        return browser.tabs.create({ url: browser.runtime.getURL("editor.html") });
      })
      .then((tab) => {
        console.log("Background: Editor tab opened with ID:", tab.id);
        // Indicate success or return data if needed by the sender
        // Since the content script doesn't wait for this, we don't strictly need to return anything here.
        // return { status: "Editor opened" };
      })
      .catch(error => {
        console.error("Background: Error processing openEditor message:", error);
        // return { status: "error", message: error.message };
      });
    // The promise chain handles the asynchronous response implicitly.
  }
  // Handle other messages if necessary
  // return Promise.resolve(); // Or Promise.reject() if it's an error
});

// Optional: Clean up storage on startup (using Promises)
// browser.runtime.onStartup.addListener(() => {
//   browser.storage.local.remove('flashcardData')
//     .then(() => console.log("Background: Cleaned up flashcardData on startup."))
//     .catch(error => console.error("Background: Error cleaning storage on startup:", error));
// });
