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
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => { // Use browser.tabs.query and .then()
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
            // Use specific check for StudyGo, regex for others
            if (service.name === "StudyGo" && service.matches[0] === "*://*.studygo.com/*/learn/lists/*") {
                 // Check protocol, domain, and path segments
                 try {
                     const url = new URL(currentTab.url);
                     const pathSegments = url.pathname.split('/').filter(p => p); // Get non-empty path parts

                     // Check: *.studygo.com, path has at least 3 parts, [1] is 'learn', [2] is 'lists'
                     if (url.hostname.endsWith('studygo.com') &&
                         pathSegments.length >= 3 &&
                         pathSegments[1] === 'learn' &&
                         pathSegments[2] === 'lists')
                     {
                         matchedService = service;
                         break;
                     }
                 } catch (e) {
                     console.error("Error parsing URL for matching:", e);
                 }
            } else {
                 // Fallback or other services: Use the regex logic (ensure it's correct)
                 try {
                    const regexPattern = service.matches[0]
                        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
                        .replace(/\*/g, '.*'); // Replace literal * with .*
                    const pattern = new RegExp(`^${regexPattern}$`); // Add ^ and $ for full match

                    if (pattern.test(currentTab.url)) {
                        matchedService = service;
                        break;
                    }
                 } catch (e) {
                    console.error(`Error testing regex for ${service.name}:`, e);
                 }
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

            browser.scripting.executeScript({ // Use browser.scripting
                target: { tabId: currentTab.id },
                files: ["browser-polyfill.min.js", matchedService.script] // Inject polyfill first
            }).then(() => {
                // Script injected successfully, now send the message
                return browser.tabs.sendMessage(currentTab.id, { action: "extractFlashcards" }); // Use browser.tabs.sendMessage
            }).then((response) => {
                 // Handle response from content script
                 if (response && response.status === "started") {
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
            }).catch((error) => {
                // Handle errors from either executeScript or sendMessage
                console.error(`Error during script execution or message sending:`, error.message);
                const statusDiv = document.getElementById('status');
                if (statusDiv) {
                    statusDiv.textContent = `Error: ${error.message}`; // Display a more specific error
                    statusDiv.style.color = 'red';
                }
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
    }).catch((error) => { // Catch errors from the initial tabs.query
        console.error("Error querying tabs:", error.message);
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = "Error getting tab info.";
            statusDiv.style.color = 'red';
        }
    });
});

// Add event listener for the settings button
document.getElementById('settingsBtn').addEventListener('click', () => {
    browser.runtime.openOptionsPage(); // Use browser.runtime
});
