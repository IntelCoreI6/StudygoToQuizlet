// Define supported services and their content scripts
const supportedServices = [
    {
        name: "StudyGo",
        matches: ["*://*.studygo.com/*/learn/lists/*"], // Changed /nl/ to /*/
        script: "content_studygo.js"
    },
    // Add other services here later, e.g.:
    // {
    //     name: "Quizlet",
    //     matches: ["*://quizlet.com/*"],
    //     script: "content_quizlet.js"
    // }
];

document.getElementById('extractBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab || !currentTab.url) {
            console.error("Could not get current tab information.");
            // Update UI: Show error
             const statusDiv = document.getElementById('status');
             if (statusDiv) {
                 statusDiv.textContent = "Error getting tab info.";
                 statusDiv.style.color = 'red';
             }
            return;
        }

        let matchedService = null;
        for (const service of supportedServices) {
            // Basic wildcard matching - convert glob to regex
            // Escape regex special chars, then replace * with .*
            const regexPattern = service.matches[0]
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
                .replace(/\*/g, '.*'); // Replace * with .*
            const pattern = new RegExp(regexPattern);

            if (pattern.test(currentTab.url)) {
                matchedService = service;
                break;
            }
        }

        if (matchedService) {
            console.log(`Matched service: ${matchedService.name}`);
            // Update UI: Indicate which service was matched
            const statusDiv = document.getElementById('status');
            if (statusDiv) {
                statusDiv.textContent = `Extracting from ${matchedService.name}...`;
                statusDiv.style.color = 'inherit'; // Reset color
            }

            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: [matchedService.script]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Error injecting script ${matchedService.script}:`, chrome.runtime.lastError.message);
                    // Update UI: Show injection error
                     const statusDiv = document.getElementById('status');
                     if (statusDiv) {
                         statusDiv.textContent = "Error injecting script.";
                         statusDiv.style.color = 'red';
                     }
                    return;
                }
                // After ensuring the script is injected, send the message
                chrome.tabs.sendMessage(currentTab.id, { action: "extractFlashcards" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message:", chrome.runtime.lastError.message);
                        // Update UI: Show message sending error
                         const statusDiv = document.getElementById('status');
                         if (statusDiv) {
                             // Don't overwrite injection error if it occurred
                             if (!statusDiv.textContent.startsWith("Error injecting")) {
                                 statusDiv.textContent = "Error communicating with page.";
                                 statusDiv.style.color = 'red';
                             }
                         }
                    } else if (response && response.status === "started") {
                        console.log("Extraction started by content script.");
                        window.close(); // Close popup once extraction starts
                    } else {
                        console.warn("Content script did not respond as expected or extraction failed.", response);
                        // Update UI: Show unexpected response error
                         const statusDiv = document.getElementById('status');
                         if (statusDiv) {
                             statusDiv.textContent = "Extraction failed or no response.";
                             statusDiv.style.color = 'orange';
                         }
                    }
                });
            });
        } else {
            console.log("Current page is not a supported service page.");
            // Update popup UI to indicate no supported service found
            const statusDiv = document.getElementById('status');
             if (statusDiv) {
                 statusDiv.textContent = "Not a supported page.";
                 statusDiv.style.color = 'orange';
             }
        }
    });
});
