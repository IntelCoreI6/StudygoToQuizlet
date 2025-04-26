// Content script running on studygo.com pages

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractFlashcards") {
    console.log("StudyGo Exporter: Received request to extract flashcards.");
    // Start waiting for elements and then extract
    waitForElementsAndExtract(sendResponse);
    return true; // Indicates asynchronous response
  }
});

function waitForElementsAndExtract(sendResponse) {
  const maxWaitTime = 15000; // Wait up to 15 seconds
  const checkInterval = 500; // Check every 500ms
  let elapsedTime = 0;

  // *** IMPORTANT: Update these selectors based on inspecting the LIVE StudyGo page ***
  // Updated selectors based on user-provided HTML snippet:
  const containerSelector = '.pair-list';       // The main container for the list
  const itemSelector = '.pair-list-item';     // Selector for individual flashcard items
  const termSelector = '.col.s-5 .info .show-on-render'; // Selector for the term within an item
  const defSelector = '.col.s-7 .info .show-on-render';   // Selector for the definition within an item

  const intervalId = setInterval(() => {
    const container = document.querySelector(containerSelector);
    const items = container ? container.querySelectorAll(itemSelector) : null;

    console.log(`StudyGo Exporter: Checking for elements... Container: ${!!container}, Items: ${items ? items.length : 0}`);

    if (container && items && items.length > 0) {
      clearInterval(intervalId);
      console.log("StudyGo Exporter: Elements found, proceeding with extraction.");
      try {
        const extractionResult = extractFlashcardsFromPage(container, itemSelector, termSelector, defSelector);
        console.log(`StudyGo Exporter: Extracted ${extractionResult.flashcards.length} flashcards.`);

        // Send extracted data to the background script
        chrome.runtime.sendMessage({
          action: "openEditor",
          data: extractionResult
        });
        sendResponse({ status: "started" }); // Acknowledge the popup

      } catch (error) {
        console.error("StudyGo Exporter: Error during extraction:", error);
        sendResponse({ status: "error", message: error.message });
      }
    } else {
      elapsedTime += checkInterval;
      if (elapsedTime >= maxWaitTime) {
        clearInterval(intervalId);
        console.error("StudyGo Exporter: Timeout waiting for flashcard elements to appear.");
        sendResponse({ status: "error", message: "Could not find flashcard elements on the page. They might not have loaded correctly or the page structure has changed." });
      }
    }
  }, checkInterval);
}


// --- Extraction Logic (Now takes selectors as arguments) ---

// Helper function to find a common ancestor (remains the same)
function findCommonAncestor(element, depth) {
    let current = element;
    for (let i = 0; i < depth; i++) {
        if (!current || !current.parentElement) break;
        current = current.parentElement;
    }
    return current;
}

// Main extraction function (runs in the context of the StudyGo page)
function extractFlashcardsFromPage(containerElement, itemSelector, termSelector, defSelector) {
    console.log('StudyGo Exporter: Starting extraction from dynamically loaded content.');
    const flashcards = [];
    let languageInfo = {
        termLanguage: 'Unknown',
        definitionLanguage: 'Unknown'
    };

    // --- Try to extract language information ---
    // Attempt to get languages from the header within the container first
    console.log('StudyGo Exporter: Searching for language indicators in header...');
    try {
        const header = containerElement.querySelector('.pair-list-header');
        let lang1 = 'Unknown', lang2 = 'Unknown';
        if (header) {
            const langElements = header.querySelectorAll('.language-row .label .show-on-render');
            if (langElements.length >= 2) {
                lang1 = langElements[0].textContent.trim();
                lang2 = langElements[1].textContent.trim();
            }
        }

        // Fallback to previous method if header doesn't yield results
        if (lang1 === 'Unknown' || lang2 === 'Unknown') {
            console.log('StudyGo Exporter: Language header not found or incomplete, trying broader search...');
            const languageElements = Array.from(document.querySelectorAll('*:not(script):not(style)'))
                .filter(el => {
                    const text = el.textContent?.trim();
                    return text && ['Engels', 'English', 'Nederlands', 'Dutch', 'Français', 'French', 'Deutsch', 'German', 'Español', 'Spanish'].includes(text);
                });
            console.log(`StudyGo Exporter: Found ${languageElements.length} potential language elements broadly.`);
            if (languageElements.length >= 2) {
                 const languageMap = {
                    'Engels': 'English', 'English': 'English',
                    'Nederlands': 'Dutch', 'Dutch': 'Dutch',
                    'Français': 'French', 'French': 'French',
                    'Deutsch': 'German', 'German': 'German',
                    'Español': 'Spanish', 'Spanish': 'Spanish'
                };
                const distinctLanguages = [...new Set(languageElements.map(el =>
                    languageMap[el.textContent.trim()] || el.textContent.trim()
                ))];
                if (distinctLanguages.length >= 2) {
                    lang1 = distinctLanguages[0];
                    lang2 = distinctLanguages[1];
                }
            }
        }

        // Assign found languages
        languageInfo.termLanguage = lang1;
        languageInfo.definitionLanguage = lang2;
        console.log('StudyGo Exporter: Determined languages:', languageInfo);

    } catch (e) {
        console.error("StudyGo Exporter: Error extracting language info:", e);
    }

    // --- Extraction Method (using provided selectors) ---
    console.log('StudyGo Exporter: Attempting extraction using updated selectors...');
    const seen = new Set();
    try {
        const potentialItems = containerElement.querySelectorAll(itemSelector);
        console.log(`StudyGo Exporter: Found ${potentialItems.length} potential items using selector "${itemSelector}".`);

        potentialItems.forEach((item, index) => {
            const termEl = item.querySelector(termSelector);
            // Find the definition element - need to be careful not to grab the term again if structure is similar
            const defEl = item.querySelector(defSelector);

            // Refinement: Ensure termEl and defEl are not the same element if selectors are too broad
            if (termEl && defEl && termEl !== defEl) {
                const term = termEl.textContent.trim();
                const definition = defEl.textContent.trim();
                if (term && definition) {
                    const key = `${term}|${definition}`;
                    if (!seen.has(key)) {
                        flashcards.push({ term, definition });
                        seen.add(key);
                    } else {
                        // console.log(`StudyGo Exporter: Skipped duplicate card ${index + 1}: ${term} / ${definition}`);
                    }
                } else {
                     // console.log(`StudyGo Exporter: Found item ${index + 1} but term or definition was empty.`);
                }
            } else {
                 // console.log(`StudyGo Exporter: Could not find distinct term/def elements in item ${index + 1} using selectors "${termSelector}" / "${defSelector}".`);
                 // Add more specific logging if needed:
                 // console.log(` - Term Element Found: ${!!termEl}, Definition Element Found: ${!!defEl}, Are they the same?: ${termEl === defEl}`);
            }
        });
        console.log(`StudyGo Exporter: Added ${flashcards.length} unique cards.`);
    } catch (e) {
        console.error("StudyGo Exporter: Error during item processing:", e);
    }

    console.log(`StudyGo Exporter: Final count before returning: ${flashcards.length}`);
    return {
        flashcards: flashcards,
        languageInfo: languageInfo
    };
}
