// JavaScript for editor.html

// DOM elements
const loadingIndicator = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const resultsSection = document.getElementById('results-section');
const flashcardsBody = document.getElementById('flashcards-body');
const copyCsvButton = document.getElementById('copy-csv-btn');
const downloadCsvButton = document.getElementById('download-csv-btn');
// Remove language info header elements
// const termLanguageElement = document.querySelector('#term-language span');
// const definitionLanguageElement = document.querySelector('#definition-language span');
const cardCountElement = document.querySelector('#card-count span');
const swapLanguagesButton = document.getElementById('swap-languages-btn');
const termHeader = document.getElementById('term-header');
const definitionHeader = document.getElementById('definition-header');
const themeToggleButton = document.getElementById('theme-toggle-btn'); // Theme toggle button
const delimiterSelect = document.getElementById('delimiter'); // Delimiter select element

// Language to Flag mapping (Using standard emoji characters)
const languageFlags = {
    'English': '🇬🇧', 'Engels': '🇬🇧',
    'Dutch': '🇳🇱', 'Nederlands': '🇳🇱',
    'French': '🇫🇷', 'Français': '🇫🇷',
    'German': '🇩🇪', 'Deutsch': '🇩🇪',
    'Spanish': '🇪🇸', 'Español': '🇪🇸',
    'Italian': '🇮🇹', 'Italiano': '🇮🇹',
    'Portuguese': '🇵🇹', 'Português': '🇵🇹',
    // Add more languages and flags as needed
    'Unknown': '❓'
};

// Language Name to flagcdn Country Code Mapping
// Note: flagcdn uses ISO 3166-1 alpha-2 codes
const languageToCountryCode = {
    'English': 'gb', 'Engels': 'gb',
    'Dutch': 'nl', 'Nederlands': 'nl',
    'French': 'fr', 'Français': 'fr',
    'German': 'de', 'Deutsch': 'de',
    'Spanish': 'es', 'Español': 'es',
    'Italian': 'it', 'Italiano': 'it',
    'Portuguese': 'pt', 'Português': 'pt',
    'Latin': 'va', // Vatican City for Latin (closest representation)
    'Greek': 'gr',
    // Add more mappings as needed
    'Unknown': '' // No code for unknown
};

// Store flashcards data and language information
let flashcardsData = [];
let languageInfo = {
    termLanguage: 'Unknown',
    definitionLanguage: 'Unknown',
    isSwapped: false
};

// --- Theme Handling ---
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleButton.textContent = '☀️'; // Sun icon for switching to light
        themeToggleButton.title = 'Switch to Light Mode';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggleButton.textContent = '🌙'; // Moon icon for switching to dark
        themeToggleButton.title = 'Switch to Dark Mode';
    }
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme); // Save preference
    applyTheme(newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    // If no theme saved, check system preference
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(savedTheme || preferredTheme);
}
// --- End Theme Handling ---


// Initialize the editor page
function initEditor() {
    console.log("Editor: Initializing...");
    showLoading(true);
    hideError();
    hideResults();
    loadTheme(); // Load theme preference on init

    // Add event listeners
    copyCsvButton.addEventListener('click', copyAsCsv);
    downloadCsvButton.addEventListener('click', downloadCsv);
    swapLanguagesButton.addEventListener('click', swapLanguages);
    themeToggleButton.addEventListener('click', toggleTheme); // Add listener for theme toggle

    // Retrieve data from chrome.storage.local
    chrome.storage.local.get('flashcardData', (result) => {
        showLoading(false);
        if (chrome.runtime.lastError) {
            console.error("Editor: Error retrieving data:", chrome.runtime.lastError);
            showError("Error loading flashcard data. Please try extracting again.");
            return;
        }

        if (result.flashcardData && result.flashcardData.flashcards) {
            console.log("Editor: Data loaded successfully.", result.flashcardData);
            flashcardsData = result.flashcardData.flashcards;
            languageInfo = { // Use defaults if not provided
                termLanguage: result.flashcardData.languageInfo?.termLanguage || 'Unknown',
                definitionLanguage: result.flashcardData.languageInfo?.definitionLanguage || 'Unknown',
                isSwapped: false
            };

            if (flashcardsData.length > 0) {
                displayFlashcards(flashcardsData);
                updateUIDisplay(); // Use combined UI update function
                showResults();
            } else {
                showError("No flashcards were extracted. Please go back to the StudyGo page and try again.");
            }

            // Optional: Clear the storage after loading to prevent reuse?
            // chrome.storage.local.remove('flashcardData');

        } else {
            console.log("Editor: No flashcard data found in storage.");
            showError("No flashcard data found. Please extract from a StudyGo page first.");
        }
    });
}

// --- Functions adapted from script.js ---

// Swap front and back of flashcards
function swapLanguages() {
    languageInfo.isSwapped = !languageInfo.isSwapped;
    // Swap actual language names
    [languageInfo.termLanguage, languageInfo.definitionLanguage] = [languageInfo.definitionLanguage, languageInfo.termLanguage];

    // Swap card content
    flashcardsData = flashcardsData.map(card => ({
        term: card.definition,
        definition: card.term
    }));

    updateUIDisplay(); // Update headers and card count
    displayFlashcards(flashcardsData); // Redisplay with swapped data
    console.log("Editor: Languages swapped.");
}

// Update the UI elements (headers, card count, flags)
function updateUIDisplay() {
    const termLang = languageInfo.termLanguage;
    const defLang = languageInfo.definitionLanguage;

    const termCode = languageToCountryCode[termLang] || '';
    const defCode = languageToCountryCode[defLang] || '';

    // Update term header
    const termFlagImg = termHeader.querySelector('.language-flag');
    const termNameSpan = termHeader.querySelector('.lang-name');
    termFlagImg.src = termCode ? `https://flagcdn.com/${termCode}.svg` : ''; // Set src URL
    termFlagImg.alt = termCode ? `${termLang} flag` : 'No flag';
    termFlagImg.style.display = termCode ? 'inline-block' : 'none'; // Hide if no code
    termNameSpan.textContent = termLang !== 'Unknown' ? termLang : 'Term';

    // Update definition header
    const defFlagImg = definitionHeader.querySelector('.language-flag');
    const defNameSpan = definitionHeader.querySelector('.lang-name');
    defFlagImg.src = defCode ? `https://flagcdn.com/${defCode}.svg` : ''; // Set src URL
    defFlagImg.alt = defCode ? `${defLang} flag` : 'No flag';
    defFlagImg.style.display = defCode ? 'inline-block' : 'none'; // Hide if no code
    defNameSpan.textContent = defLang !== 'Unknown' ? defLang : 'Definition';

    // Update card count
    cardCountElement.textContent = flashcardsData.length;
}

// Display flashcards in the table
function displayFlashcards(flashcards) {
    flashcardsBody.innerHTML = ''; // Clear existing rows
    flashcards.forEach((card, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index; // Add index to the row for easier access
        // Use Font Awesome trash icon for delete button
        row.innerHTML = `
            <td class="term editable" tabindex="0">${escapeHtml(card.term)}</td>
            <td class="definition editable" tabindex="0">${escapeHtml(card.definition)}</td>
            <td class="action-cell">
                <button class="delete-btn" data-index="${index}" title="Delete Card">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        flashcardsBody.appendChild(row);
    });

    // Add event listeners for delete buttons and editable cells
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteFlashcard);
    });
    document.querySelectorAll('.editable').forEach(cell => {
        cell.addEventListener('click', makeCellEditable);
        cell.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                makeCellEditable(e);
            }
        });
        // Add focusout listener to save if user tabs away
        cell.addEventListener('focusout', (e) => {
            const input = cell.querySelector('.edit-input');
            // If focus moves outside the input but is still within the cell (e.g., clicking the cell again), don't save yet.
            // If focus moves to something outside the cell, save.
            if (input && !cell.contains(e.relatedTarget)) {
                 saveCellEdit(cell, input);
            }
        });
    });

    console.log(`Editor: Displayed ${flashcards.length} cards.`);
}

// Make a table cell editable
function makeCellEditable(event) {
    const cell = event.target.closest('.editable'); // Ensure we get the TD even if click is on inner text
    if (!cell || cell.querySelector('input')) return; // Not an editable cell or already editing

    const originalText = cell.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.classList.add('edit-input');

    // Save on blur (clicking outside)
    input.addEventListener('blur', (e) => {
        // Small delay to allow potential click on delete button to register first
        setTimeout(() => {
             // Check if focus moved outside the cell entirely before saving
             if (!cell.contains(document.activeElement)) {
                saveCellEdit(cell, input);
             }
        }, 100);
    });

    // Save on Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur(); // Trigger blur to save
        }
    });
     // Save on Escape key (revert) - optional
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cell.innerHTML = escapeHtml(originalText); // Revert
            input.removeEventListener('blur', saveCellEdit); // Prevent saving on blur after revert
        }
    });


    cell.innerHTML = ''; // Clear the cell
    cell.appendChild(input);
    input.focus();
    input.select(); // Select text for easy replacement
}

// Save the edited cell content
function saveCellEdit(cell, input) {
    // Check if input is still part of the DOM (might have been removed by revert/delete)
    if (!input || !document.body.contains(input)) {
        return;
    }

    const newValue = input.value.trim();
    const rowIndex = parseInt(cell.closest('tr').dataset.index);
    const isTerm = cell.classList.contains('term');

    // Only update if the value actually changed
    let originalValue = '';
    if (!isNaN(rowIndex) && flashcardsData[rowIndex]) {
         originalValue = isTerm ? flashcardsData[rowIndex].term : flashcardsData[rowIndex].definition;
         if (newValue !== originalValue) {
            if (isTerm) {
                flashcardsData[rowIndex].term = newValue;
            } else {
                flashcardsData[rowIndex].definition = newValue;
            }
            console.log(`Editor: Updated card at index ${rowIndex}.`);
         }
    }

    cell.innerHTML = escapeHtml(newValue); // Put the new text back (escaped)
}


// Delete flashcard
function deleteFlashcard(event) {
    // Use currentTarget to ensure the listener on the button is used, even if click is on icon
    const button = event.currentTarget;
    const index = parseInt(button.dataset.index);
    if (isNaN(index) || index < 0 || index >= flashcardsData.length) return;

    // Find the row to visually indicate deletion (optional)
    const row = button.closest('tr');
    // row?.classList.add('deleting'); // Optional: Add style for visual feedback

    // Use a more subtle confirmation or skip if desired
    // if (confirm(`Delete card: "${flashcardsData[index].term}"?`)) {
        flashcardsData.splice(index, 1); // Remove from data array
        displayFlashcards(flashcardsData); // Re-render the table
        updateUIDisplay(); // Update card count
        console.log(`Editor: Deleted card at index ${index}.`);
    // } else {
    //     row?.classList.remove('deleting'); // Remove visual feedback if cancelled
    // }
}

// Convert flashcards to CSV format with specified delimiter
function convertToCsv(flashcards, delimiter = ',') {
    // Ensure delimiter is a single character or tab
    if (delimiter.length > 1 && delimiter !== '\t') { // Check against actual tab character
        console.warn("Delimiter should be a single character or tab. Using default comma.");
        delimiter = ',';
    }

    let csv = ''; // Start empty
    flashcards.forEach(card => {
        let term = card.term || '';
        let definition = card.definition || '';

        // Basic escaping: Replace newlines with spaces.
        term = term.replace(/\r\n|\r|\n/g, ' ');
        definition = definition.replace(/\r\n|\r|\n/g, ' ');

        // Quote fields if they contain the delimiter or double quotes (standard CSV practice)
        const needsQuoting = term.includes(delimiter) || term.includes('"') || definition.includes(delimiter) || definition.includes('"');

        if (needsQuoting && delimiter === ',') { // Only apply standard CSV quoting for commas
             // Escape double quotes by doubling them
             term = `"${term.replace(/"/g, '""')}"`;
             definition = `"${definition.replace(/"/g, '""')}"`;
        } else {
            // For other delimiters (like tab or equals), simply replace the delimiter if it appears in the field.
            // This is a simpler approach, might not cover all edge cases for TSV etc.
            const regex = new RegExp(delimiter === '\t' ? '\t' : delimiter, 'g');
            term = term.replace(regex, ' ');
            definition = definition.replace(regex, ' ');
        }

        csv += `${term}${delimiter}${definition}\n`;
    });
    return csv; // Return without header for easier Quizlet import paste
}


// Copy CSV to clipboard
function copyAsCsv() {
    if (flashcardsData.length === 0) {
        alert('No flashcards to copy.');
        return;
    }
    const selectedDelimiter = delimiterSelect.value === '\t' ? '\t' : delimiterSelect.value; // Get selected delimiter, handle tab correctly
    const csv = convertToCsv(flashcardsData, selectedDelimiter);
    navigator.clipboard.writeText(csv)
        .then(() => {
            alert('Flashcard data copied to clipboard!');
            console.log("Editor: Data copied with delimiter:", selectedDelimiter === '\t' ? 'Tab' : selectedDelimiter);
        })
        .catch(err => {
            console.error('Editor: Failed to copy data:', err);
            alert('Failed to copy data. Please try again or use the download option.');
        });
}

// Download CSV file
function downloadCsv() {
    if (flashcardsData.length === 0) {
        alert('No flashcards to download.');
        return;
    }
    const selectedDelimiter = delimiterSelect.value === '\t' ? '\t' : delimiterSelect.value; // Get selected delimiter, handle tab correctly
    const csv = convertToCsv(flashcardsData, selectedDelimiter);
    // Use text/plain which is generally safer and works for CSV/TSV.
    const blob = new Blob([csv], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    // Determine file extension based on delimiter
    let fileExtension = 'txt';
    if (selectedDelimiter === ',') {
        fileExtension = 'csv';
    } else if (selectedDelimiter === '\t') { // Check against actual tab
        fileExtension = 'tsv'; // Use .tsv for tab-separated
    }

    link.setAttribute('download', `studygo_flashcards.${fileExtension}`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up blob URL
    console.log("Editor: Data download initiated as", `studygo_flashcards.${fileExtension}`);
}

// Helper functions for UI state
function showLoading(show) {
    loadingIndicator.classList.toggle('hidden', !show);
}
function showError(message) {
    errorMessage.querySelector('p').textContent = message;
    errorMessage.classList.remove('hidden');
    console.error("Editor: Error displayed -", message);
}
function hideError() {
    errorMessage.classList.add('hidden');
}
function showResults() {
    resultsSection.classList.remove('hidden');
}
function hideResults() {
    resultsSection.classList.add('hidden');
}

// Escape HTML to prevent XSS (Simple version)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || ''; // Handle null/undefined
    return div.innerHTML;
}

// Initialize the editor when the DOM is loaded
document.addEventListener('DOMContentLoaded', initEditor);
