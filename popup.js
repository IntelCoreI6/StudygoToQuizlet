document.getElementById('extractBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Check if the active tab is a StudyGo list page before sending the message
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('studygo.com/nl/learn/lists/')) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js'] // Ensure content script is injected if not already
      }, () => {
        // After ensuring the script is injected, send the message
        chrome.tabs.sendMessage(tabs[0].id, { action: "extractFlashcards" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError.message);
            // Optionally update popup UI to show an error
          } else if (response && response.status === "started") {
            // Optionally update popup UI to show "Working..."
            window.close(); // Close popup once extraction starts
          } else {
            // Handle cases where content script isn't ready or doesn't respond
            console.warn("Content script did not respond as expected.");
          }
        });
      });
    } else {
      // Optionally update popup UI to say "Not a StudyGo list page"
      console.log("Not on a valid StudyGo list page.");
    }
  });
});
