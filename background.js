// Background service worker

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openEditor" && request.data) {
    console.log("Background: Received flashcard data, preparing to open editor.");

    // Store data temporarily using chrome.storage.local
    chrome.storage.local.set({ flashcardData: request.data }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving data to storage:", chrome.runtime.lastError);
        return;
      }
      console.log("Background: Data saved to local storage.");

      // Open the editor.html page in a new tab
      chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") }, (tab) => {
        console.log("Background: Editor tab opened with ID:", tab.id);
      });
    });

    // Optional: Send a response back if needed
    // sendResponse({ status: "Editor opening" });
    return true; // Indicate potential async response if we used sendResponse
  }
});

// Optional: Clean up storage when the browser closes or on startup?
// chrome.runtime.onStartup.addListener(() => {
//   chrome.storage.local.remove('flashcardData');
// });
