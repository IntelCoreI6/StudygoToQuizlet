// Main JavaScript for the StudyGo Flashcard Converter

// DOM elements
const studygoUrlInput = document.getElementById('studygo-url');
const fetchButton = document.getElementById('fetch-btn');
const loadingIndicator = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const resultsSection = document.getElementById('results-section');
const flashcardsBody = document.getElementById('flashcards-body');
const copyCsvButton = document.getElementById('copy-csv-btn');
const downloadCsvButton = document.getElementById('download-csv-btn');
const csvPreview = document.getElementById('csv-preview');
const csvContent = document.getElementById('csv-content');
const termLanguageElement = document.querySelector('#term-language span');
const definitionLanguageElement = document.querySelector('#definition-language span');
const cardCountElement = document.querySelector('#card-count span');
const swapLanguagesButton = document.getElementById('swap-languages-btn');
const termHeader = document.getElementById('term-header');
const definitionHeader = document.getElementById('definition-header');
// Settings & Debug elements
const settingsIcon = document.getElementById('settings-icon');
const settingsPanel = document.getElementById('settings-panel');
const debugModeCheckbox = document.getElementById('debug-mode-checkbox');
const debugOutputSection = document.getElementById('debug-output-section');
const debugLogElement = document.getElementById('debug-log');

// Store flashcards data and language information
let flashcardsData = [];
let languageInfo = {
    termLanguage: 'English',
    definitionLanguage: 'Dutch',
    isSwapped: false
};
let isDebugMode = false; // Debug mode state

// Debug logging function
function debugLog(message, data = null) {
    if (!isDebugMode) return;

    const timestamp = new Date().toLocaleTimeString();
    let logEntry = `[${timestamp}] ${message}`;
    if (data) {
        // Attempt to stringify data, handle potential circular references
        try {
            logEntry += `\nData: ${JSON.stringify(data, null, 2)}`;
        } catch (e) {
            logEntry += `\nData: [Could not stringify data - ${e.message}]`;
        }
    }
    console.log(logEntry); // Also log to browser console
    debugLogElement.textContent += logEntry + '\n\n';
    // Scroll to bottom
    debugLogElement.scrollTop = debugLogElement.scrollHeight;
}

// Initialize the application
function init() {
    // Add event listeners
    fetchButton.addEventListener('click', fetchFlashcards);
    copyCsvButton.addEventListener('click', copyAsCsv);
    downloadCsvButton.addEventListener('click', downloadCsv);
    swapLanguagesButton.addEventListener('click', swapLanguages);
    settingsIcon.addEventListener('click', toggleSettingsPanel);
    debugModeCheckbox.addEventListener('change', toggleDebugMode);

    // Load debug mode state from local storage (optional persistence)
    isDebugMode = localStorage.getItem('isDebugMode') === 'true';
    debugModeCheckbox.checked = isDebugMode;
    if (isDebugMode) {
        debugOutputSection.classList.remove('hidden');
    }

    // Check if URL is pre-filled and fetch automatically
    if (studygoUrlInput.value) {
        fetchFlashcards();
    }
}

// Toggle settings panel visibility
function toggleSettingsPanel() {
    settingsPanel.classList.toggle('hidden');
}

// Toggle debug mode
function toggleDebugMode() {
    isDebugMode = debugModeCheckbox.checked;
    localStorage.setItem('isDebugMode', isDebugMode); // Persist setting
    if (isDebugMode) {
        debugOutputSection.classList.remove('hidden');
        debugLogElement.textContent = ''; // Clear previous logs
        debugLog('Debug mode enabled.');
    } else {
        debugLog('Debug mode disabled.');
        // Optionally hide the debug section after a delay or keep it visible
        debugOutputSection.classList.add('hidden');
    }
}

// Fetch flashcards from StudyGo URL
async function fetchFlashcards() {
    const url = studygoUrlInput.value.trim();
    debugLog(`Starting fetch for URL: ${url}`);

    // Validate URL
    if (!url || !url.includes('studygo.com')) {
        showError('Please enter a valid StudyGo URL');
        debugLog('URL validation failed.');
        return;
    }

    // Show loading indicator
    showLoading(true);
    hideError();
    hideResults();
    if (isDebugMode) {
        debugOutputSection.classList.remove('hidden'); // Ensure visible
        debugLogElement.textContent = ''; // Clear logs for new fetch
        debugLog('UI reset for fetching.');
    }

    // Explain the challenges of client-side fetching
    debugLog("Attempting to fetch StudyGo page using CORS proxies. Note: This method relies on third-party services and may be unreliable due to CORS restrictions, proxy availability, or dynamic content loading on StudyGo.");

    try {
        // List of CORS proxies to try
        const corsProxies = [
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
        ];
        debugLog('Using CORS Proxies:', corsProxies);

        let html = null;
        let lastError = null; // Keep track of the last error encountered

        // Try fetching from each proxy until one succeeds
        for (const proxyUrl of corsProxies) {
            debugLog(`Trying proxy: ${proxyUrl}`);
            try {
                const startTime = performance.now();
                const response = await fetch(proxyUrl, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const duration = performance.now() - startTime;
                debugLog(`Proxy response status: ${response.status} (${response.statusText}) from ${proxyUrl}. Took ${duration.toFixed(0)}ms.`);

                if (response.ok) {
                    html = await response.text();
                    debugLog(`Successfully fetched ${html.length} bytes using: ${proxyUrl}`);
                    // Log the first 1000 chars of HTML in debug mode
                    debugLog('Fetched HTML (first 1000 chars):\n' + (html ? html.substring(0, 1000) + '...' : '[No HTML content]'));
                    // Optionally log the full HTML (can be very long!)
                    // debugLog('Full Fetched HTML:', html);
                    break; // Exit the loop if successful
                } else {
                    debugLog(`Proxy ${proxyUrl} failed with status: ${response.status}`);
                    lastError = new Error(`Proxy request failed with status ${response.status}`);
                }
            } catch (error) {
                debugLog(`Proxy ${proxyUrl} failed with error:`, error);
                lastError = error; // Update last error
            }
        }

        // If all proxies failed, provide a detailed error message
        if (!html) {
            let detailedError = 'Failed to fetch the StudyGo page using available CORS proxies.';
            if (lastError) {
                detailedError += ` Last error: ${lastError.message}.`;
            }
            detailedError += '\n\nThis could be due to several reasons:\n' +
                             '1. The CORS proxies might be down, rate-limited, or blocked.\n' +
                             '2. StudyGo might be blocking requests from these proxies or changed its structure.\n' +
                             '3. Network connectivity issues.\n' +
                             '4. The flashcards might be loaded dynamically after the initial page load, which this tool cannot capture directly.\n\n' +
                             'Fetching external websites directly from a browser (like on GitHub Pages) is restricted by security policies (CORS). Using a dedicated server or serverless function as a proxy is a more reliable approach, but beyond the scope of this client-side tool.';

            // Add specific advice based on context
            if (window.location.protocol === 'file:') {
                 detailedError += '\n\nRunning locally? Try using a local server (e.g., `python -m http.server`) or a browser extension that handles CORS (use with caution).';
            } else {
                 detailedError += '\n\nConsider trying again later, checking the StudyGo URL, or verifying if the page content loads dynamically.';
            }
            debugLog('All proxies failed.', { lastError: lastError?.message });
            throw new Error(detailedError); // Throw a new error with the detailed message
        }

        // Extract flashcards and language info from HTML
        debugLog('Starting HTML parsing and extraction...');
        const extractionResult = extractFlashcardsFromHtml(html, url);
        flashcardsData = extractionResult.flashcards;
        debugLog(`Extraction complete. Found ${flashcardsData.length} flashcards.`);
        debugLog('Extracted Language Info:', extractionResult.languageInfo);

        // Update language info if available
        if (extractionResult.languageInfo) {
            languageInfo.termLanguage = extractionResult.languageInfo.termLanguage || 'English';
            languageInfo.definitionLanguage = extractionResult.languageInfo.definitionLanguage || 'Dutch';
            languageInfo.isSwapped = false;
            debugLog('Updated language info state:', languageInfo);
        }

        if (flashcardsData.length === 0) {
            debugLog('No flashcards extracted from the HTML.');
            // Keep the existing check for empty results, but the fetch error is handled above
            if (window.location.protocol === 'file:') {
                showError('No flashcards found. This may be due to CORS restrictions when running locally. Try one of these solutions:\n\n' +
                          '1. Upload to GitHub Pages (recommended)\n' +
                          '2. Use a local server (e.g., python -m http.server)\n' +
                          '3. Install a CORS browser extension');
            } else {
                showError('No flashcards found on this page. This might happen if the content is loaded dynamically after the page loads, or if the page structure has changed. Please check the URL and try again. Enable Debug Mode (cog icon) for more details.');
            }
            return;
        }

        // Display flashcards and language info
        debugLog('Displaying results...');
        displayFlashcards(flashcardsData);
        updateLanguageDisplay();
        showResults();
        debugLog('Fetch and display process completed successfully.');

    } catch (error) {
        console.error('Error in fetchFlashcards:', error);
        debugLog('Error caught in fetchFlashcards:', { message: error.message, stack: error.stack });
        // Display the potentially detailed error message from the fetch block or other errors
        showError(error.message || 'An unexpected error occurred during fetching or processing.');

    } finally {
        showLoading(false);
        debugLog('fetchFlashcards function finished.');
    }
}

// Extract flashcards from HTML content
function extractFlashcardsFromHtml(html, url) {
    debugLog('Entering extractFlashcardsFromHtml function.');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    debugLog('HTML parsed into DOM object.');
    const flashcards = [];
    let languageInfo = {
        termLanguage: 'English',
        definitionLanguage: 'Dutch'
    };

    // Try to extract the total number of flashcards from the page
    const wordCountElements = doc.querySelectorAll('*');
    let totalFlashcards = 0;
    debugLog('Searching for total flashcard count indicator...');
    for (const el of wordCountElements) {
        const text = el.textContent.trim();
        const match = text.match(/(\d+)\s+(woorden|words)/i);
        if (match) {
            totalFlashcards = parseInt(match[1]);
            debugLog(`Found potential total flashcard count: ${totalFlashcards}`);
            break;
        }
    }
    if (totalFlashcards === 0) {
        debugLog('Could not find total flashcard count indicator.');
    }

    // Try to extract language information
    debugLog('Searching for language indicators...');
    const languageElements = Array.from(doc.querySelectorAll('*')).filter(el => {
        const text = el.textContent.trim();
        return ['Engels', 'English', 'Nederlands', 'Dutch', 'Français', 'French', 'Deutsch', 'German', 'Español', 'Spanish'].includes(text);
    });
    debugLog(`Found ${languageElements.length} potential language elements.`);

    if (languageElements.length >= 2) {
        // ... (rest of language extraction logic - add debug logs inside if needed)
        debugLog('Attempting to determine term/definition languages.');
        // ... existing code ...
        if (distinctLanguages.length >= 2) {
            languageInfo.termLanguage = distinctLanguages[0];
            languageInfo.definitionLanguage = distinctLanguages[1];
            debugLog('Determined languages:', languageInfo);
        }
    }

    // Method 1: Look for specific elements
    debugLog('Attempting extraction Method 1: Specific div structure...');
    const rows = doc.querySelectorAll('div > div > div > div');
    debugLog(`Method 1: Found ${rows.length} potential row elements.`);
    const processedRows = new Set();
    rows.forEach((row, index) => {
        // ... existing code ...
        // Add debug logs inside the loops if needed, e.g.:
        // debugLog(`Method 1, Row ${index}: Processing texts...`);
        // ... existing code ...
        if (processedRows.has(row)) {
             // debugLog(`Method 1, Row ${index}: Added card: ${term} / ${definition}`);
        }
    });
    debugLog(`Method 1: Found ${flashcards.length} cards so far.`);

    // Method 2: Pattern-based search
    if (flashcards.length === 0 || (totalFlashcards > 0 && flashcards.length < totalFlashcards)) {
        debugLog('Attempting extraction Method 2: Pattern-based search...');
        // ... existing code ...
        // Add debug logs inside loops if needed
        debugLog(`Method 2: Found ${flashcards.length} cards so far.`);
    }

    // Method 3: Language indicator proximity
    if (flashcards.length === 0 || (totalFlashcards > 0 && flashcards.length < totalFlashcards)) {
        debugLog('Attempting extraction Method 3: Language indicator proximity...');
        // ... existing code ...
        // Add debug logs inside loops if needed
        debugLog(`Method 3: Found ${flashcards.length} cards so far.`);
    }

    // Method 4: Numbered elements
    if (flashcards.length === 0 || (totalFlashcards > 0 && flashcards.length < totalFlashcards)) {
        debugLog('Attempting extraction Method 4: Numbered elements...');
        // ... existing code ...
        // Add debug logs inside loops if needed
        debugLog(`Method 4: Found ${flashcards.length} cards so far.`);
    }

    // Remove duplicates
    debugLog(`Total cards found before deduplication: ${flashcards.length}`);
    const uniqueFlashcards = [];
    const seen = new Set();
    flashcards.forEach(card => {
        const key = `${card.term}|${card.definition}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueFlashcards.push(card);
        }
    });
    debugLog(`Total unique cards found: ${uniqueFlashcards.length}`);

    debugLog('Exiting extractFlashcardsFromHtml function.');
    return {
        flashcards: uniqueFlashcards,
        languageInfo: languageInfo
    };
}

// Helper function to find a common ancestor for an element
function findCommonAncestor(element, depth) {
    let current = element;
    for (let i = 0; i < depth; i++) {
        if (!current.parentElement) break;
        current = current.parentElement;
    }
    return current;
}

// Swap front and back of flashcards
function swapLanguages() {
    debugLog('Swapping languages.');
    // Toggle the swapped state
    languageInfo.isSwapped = !languageInfo.isSwapped;
    
    // Swap the flashcards data
    flashcardsData = flashcardsData.map(card => ({
        term: card.definition,
        definition: card.term
    }));
    
    // Update the display
    updateLanguageDisplay();
    displayFlashcards(flashcardsData);
    debugLog('Languages swapped and display updated.');
}

// Update the language display
function updateLanguageDisplay() {
    if (languageInfo.isSwapped) {
        termLanguageElement.textContent = languageInfo.definitionLanguage;
        definitionLanguageElement.textContent = languageInfo.termLanguage;
        termHeader.textContent = languageInfo.definitionLanguage;
        definitionHeader.textContent = languageInfo.termLanguage;
    } else {
        termLanguageElement.textContent = languageInfo.termLanguage;
        definitionLanguageElement.textContent = languageInfo.definitionLanguage;
        termHeader.textContent = 'Term';
        definitionHeader.textContent = 'Definition';
    }
    
    // Update card count
    cardCountElement.textContent = flashcardsData.length;
    // debugLog('Language display updated.'); // Optional: can be noisy
}

// Display flashcards in the table
function displayFlashcards(flashcards) {
    debugLog(`Displaying ${flashcards.length} flashcards in table.`);
    flashcardsBody.innerHTML = '';
    
    flashcards.forEach((card, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="term" data-index="${index}">${escapeHtml(card.term)}</td>
            <td class="definition" data-index="${index}">${escapeHtml(card.definition)}</td>
            <td>
                <button class="edit-btn" data-index="${index}">Edit</button>
                <button class="delete-btn" data-index="${index}">Delete</button>
            </td>
        `;
        flashcardsBody.appendChild(row);
    });
    
    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', editFlashcard);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteFlashcard);
    });
    
    // Generate and display CSV preview
    updateCsvPreview();
    debugLog('Flashcard table populated and CSV preview updated.');
}

// Edit flashcard
function editFlashcard(event) {
    const index = parseInt(event.target.dataset.index);
    debugLog(`Editing flashcard at index: ${index}`);
    const card = flashcardsData[index];
    
    const termCell = document.querySelector(`.term[data-index="${index}"]`);
    const definitionCell = document.querySelector(`.definition[data-index="${index}"]`);
    
    const newTerm = prompt('Edit term:', card.term);
    if (newTerm !== null) {
        const newDefinition = prompt('Edit definition:', card.definition);
        if (newDefinition !== null) {
            // Update data and display
            flashcardsData[index] = {
                term: newTerm,
                definition: newDefinition
            };
            
            termCell.textContent = newTerm;
            definitionCell.textContent = newDefinition;
            debugLog(`Flashcard ${index} updated:`, flashcardsData[index]);
            // Update CSV preview
            updateCsvPreview();
        }
    }
}

// Delete flashcard
function deleteFlashcard(event) {
    const index = parseInt(event.target.dataset.index);
    debugLog(`Attempting to delete flashcard at index: ${index}`);
    if (confirm('Are you sure you want to delete this flashcard?')) {
        // Remove from data array
        flashcardsData.splice(index, 1);
        debugLog(`Flashcard ${index} deleted.`);
        // Redisplay flashcards
        displayFlashcards(flashcardsData);
        updateLanguageDisplay(); // Update card count
    }
}

// Convert flashcards to CSV format
function convertToCsv(flashcards) {
    // debugLog(`Converting ${flashcards.length} cards to CSV.`); // Optional: can be noisy
    // Add header row
    let csv = 'Term,Definition\n';
    
    // Add data rows
    flashcards.forEach(card => {
        // Escape quotes and wrap fields in quotes to handle commas
        const term = `"${card.term.replace(/"/g, '""')}"`;
        const definition = `"${card.definition.replace(/"/g, '""')}"`;
        csv += `${term},${definition}\n`;
    });
    
    return csv;
}

// Update CSV preview
function updateCsvPreview() {
    const csv = convertToCsv(flashcardsData);
    csvContent.textContent = csv;
    csvPreview.classList.remove('hidden');
    // debugLog('CSV preview updated.'); // Optional: can be noisy
}

// Copy CSV to clipboard
function copyAsCsv() {
    debugLog('Attempting to copy CSV to clipboard.');
    const csv = convertToCsv(flashcardsData);
    
    navigator.clipboard.writeText(csv)
        .then(() => {
            alert('CSV copied to clipboard!');
            debugLog('CSV copied successfully.');
        })
        .catch(err => {
            console.error('Failed to copy CSV:', err);
            alert('Failed to copy CSV. Please try again or use the download option.');
            debugLog('Failed to copy CSV.', err);
        });
}

// Download CSV file
function downloadCsv() {
    debugLog('Attempting to download CSV file.');
    const csv = convertToCsv(flashcardsData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'flashcards.csv');
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    debugLog('CSV download initiated.');
}

// Helper functions
function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
        // debugLog('Loading indicator shown.');
    } else {
        loadingIndicator.classList.add('hidden');
        // debugLog('Loading indicator hidden.');
    }
}

function showError(message) {
    errorMessage.querySelector('p').textContent = message;
    errorMessage.classList.remove('hidden');
    debugLog('Error message shown:', message);
}

function hideError() {
    errorMessage.classList.add('hidden');
    // debugLog('Error message hidden.');
}

function showResults() {
    resultsSection.classList.remove('hidden');
    // debugLog('Results section shown.');
}

function hideResults() {
    resultsSection.classList.add('hidden');
    // debugLog('Results section hidden.');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
