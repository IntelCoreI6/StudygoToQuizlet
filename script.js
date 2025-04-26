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

// Store flashcards data and language information
let flashcardsData = [];
let languageInfo = {
    termLanguage: 'English',
    definitionLanguage: 'Dutch',
    isSwapped: false
};

// Initialize the application
function init() {
    // Add event listeners
    fetchButton.addEventListener('click', fetchFlashcards);
    copyCsvButton.addEventListener('click', copyAsCsv);
    downloadCsvButton.addEventListener('click', downloadCsv);
    swapLanguagesButton.addEventListener('click', swapLanguages);
    
    // Check if URL is pre-filled and fetch automatically
    if (studygoUrlInput.value) {
        fetchFlashcards();
    }
}

// Fetch flashcards from StudyGo URL
async function fetchFlashcards() {
    const url = studygoUrlInput.value.trim();
    
    // Validate URL
    if (!url || !url.includes('studygo.com')) {
        showError('Please enter a valid StudyGo URL');
        return;
    }
    
    // Show loading indicator
    showLoading(true);
    hideError();
    hideResults();
    
    try {
        // Try multiple CORS proxies in case one fails
        const corsProxies = [
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://cors-anywhere.herokuapp.com/${url}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
        ];
        
        let html = null;
        let fetchError = null;
        
        // Try each proxy until one works
        for (const proxyUrl of corsProxies) {
            try {
                const response = await fetch(proxyUrl);
                
                if (response.ok) {
                    html = await response.text();
                    break; // Exit the loop if successful
                }
            } catch (error) {
                fetchError = error;
                console.log(`Proxy ${proxyUrl} failed:`, error);
                // Continue to the next proxy
            }
        }
        
        // If all proxies failed
        if (!html) {
            throw new Error(fetchError || 'All CORS proxies failed');
        }
        
        // Extract flashcards and language info from HTML
        const extractionResult = extractFlashcardsFromHtml(html, url);
        flashcardsData = extractionResult.flashcards;
        
        // Update language info if available
        if (extractionResult.languageInfo) {
            languageInfo.termLanguage = extractionResult.languageInfo.termLanguage || 'English';
            languageInfo.definitionLanguage = extractionResult.languageInfo.definitionLanguage || 'Dutch';
            languageInfo.isSwapped = false;
        }
        
        if (flashcardsData.length === 0) {
            // Check if we're running locally (file:// protocol)
            if (window.location.protocol === 'file:') {
                showError('No flashcards found. This may be due to CORS restrictions when running locally. Try one of these solutions:\n\n' +
                          '1. Upload to GitHub Pages (recommended)\n' +
                          '2. Use a local server (e.g., python -m http.server)\n' +
                          '3. Install a CORS browser extension');
            } else {
                showError('No flashcards found on this page. Please check the URL and try again.');
            }
            return;
        }
        
        // Display flashcards and language info
        displayFlashcards(flashcardsData);
        updateLanguageDisplay();
        showResults();
        
    } catch (error) {
        console.error('Error fetching flashcards:', error);
        
        // Check if we're running locally (file:// protocol)
        if (window.location.protocol === 'file:') {
            showError('Error fetching flashcards. This is likely due to CORS restrictions when running locally. Try one of these solutions:\n\n' +
                      '1. Upload to GitHub Pages (recommended)\n' +
                      '2. Use a local server (e.g., python -m http.server)\n' +
                      '3. Install a CORS browser extension');
        } else {
            showError('Error fetching flashcards. Please check the URL and try again.');
        }
    } finally {
        showLoading(false);
    }
}

// Extract flashcards from HTML content
function extractFlashcardsFromHtml(html, url) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const flashcards = [];
    let languageInfo = {
        termLanguage: 'English',
        definitionLanguage: 'Dutch'
    };
    
    // Try to extract the total number of flashcards from the page
    const wordCountElements = doc.querySelectorAll('*');
    let totalFlashcards = 0;
    
    for (const el of wordCountElements) {
        const text = el.textContent.trim();
        // Look for patterns like "25 WOORDEN" or "25 words"
        const match = text.match(/(\d+)\s+(woorden|words)/i);
        if (match) {
            totalFlashcards = parseInt(match[1]);
            console.log(`Found ${totalFlashcards} flashcards mentioned on the page`);
            break;
        }
    }
    
    // Try to extract language information
    const languageElements = Array.from(doc.querySelectorAll('*')).filter(el => {
        const text = el.textContent.trim();
        return text === 'Engels' || text === 'English' || 
               text === 'Nederlands' || text === 'Dutch' ||
               text === 'Français' || text === 'French' ||
               text === 'Deutsch' || text === 'German' ||
               text === 'Español' || text === 'Spanish';
    });
    
    if (languageElements.length >= 2) {
        // Map language text to standardized names
        const languageMap = {
            'Engels': 'English',
            'English': 'English',
            'Nederlands': 'Dutch',
            'Dutch': 'Dutch',
            'Français': 'French',
            'French': 'French',
            'Deutsch': 'German',
            'German': 'German',
            'Español': 'Spanish',
            'Spanish': 'Spanish'
        };
        
        // Get the first two distinct languages
        const distinctLanguages = [...new Set(languageElements.map(el => 
            languageMap[el.textContent.trim()] || el.textContent.trim()
        ))];
        
        if (distinctLanguages.length >= 2) {
            languageInfo.termLanguage = distinctLanguages[0];
            languageInfo.definitionLanguage = distinctLanguages[1];
        }
    }
    
    // Method 1: Look for specific elements that might contain flashcard data
    // This is based on our analysis of the StudyGo page structure
    const rows = doc.querySelectorAll('div > div > div > div');
    
    // Track which rows we've processed to avoid duplicates
    const processedRows = new Set();
    
    // First pass: Look for rows with term and definition text
    rows.forEach(row => {
        if (processedRows.has(row)) return;
        
        const allTexts = Array.from(row.querySelectorAll('*'))
            .map(el => el.textContent.trim())
            .filter(text => text && text.length > 0);
        
        // Look for potential term-definition pairs
        // We're assuming terms are on the left side and definitions on the right
        const leftSideTexts = allTexts.slice(0, Math.ceil(allTexts.length / 2));
        const rightSideTexts = allTexts.slice(Math.ceil(allTexts.length / 2));
        
        for (const term of leftSideTexts) {
            for (const definition of rightSideTexts) {
                // Skip very short texts or identical texts
                if (term.length < 2 || definition.length < 2 || term === definition) continue;
                
                // Skip texts that are likely not flashcard content (buttons, headers, etc.)
                if (term.includes('Log in') || term.includes('Register') || 
                    definition.includes('Log in') || definition.includes('Register')) continue;
                
                flashcards.push({
                    term: term,
                    definition: definition
                });
                
                processedRows.add(row);
                break; // Only take the first match from this row
            }
            if (processedRows.has(row)) break;
        }
    });
    
    // Method 2: Try to find elements with specific patterns that might be flashcards
    if (flashcards.length === 0 || (totalFlashcards > 0 && flashcards.length < totalFlashcards)) {
        // Look for elements that might contain flashcard terms
        const potentialTerms = Array.from(doc.querySelectorAll('*')).filter(el => {
            const text = el.textContent.trim();
            // Filter for elements that might be terms (not too long, not too short)
            return text && text.length > 1 && text.length < 100 && 
                   !text.includes('Log in') && !text.includes('Register');
        });
        
        // For each potential term, look for a corresponding definition
        potentialTerms.forEach(termEl => {
            const term = termEl.textContent.trim();
            
            // Look for potential definition elements near the term element
            let parent = termEl.parentElement;
            for (let i = 0; i < 3; i++) { // Check up to 3 levels up
                if (!parent) break;
                
                // Look for siblings or cousins that might be definitions
                const siblings = Array.from(parent.children);
                const potentialDefinitions = siblings.filter(el => {
                    if (el === termEl) return false;
                    
                    const text = el.textContent.trim();
                    return text && text.length > 1 && text.length < 100 &&
                           !text.includes('Log in') && !text.includes('Register');
                });
                
                // If we found potential definitions, add them as flashcards
                potentialDefinitions.forEach(defEl => {
                    const definition = defEl.textContent.trim();
                    if (term !== definition) {
                        flashcards.push({
                            term: term,
                            definition: definition
                        });
                    }
                });
                
                parent = parent.parentElement;
            }
        });
    }
    
    // Method 3: Look for specific patterns in the HTML that might indicate flashcards
    if (flashcards.length === 0 || (totalFlashcards > 0 && flashcards.length < totalFlashcards)) {
        // Try to find language indicators (like "Engels" and "Nederlands")
        const englishElements = Array.from(doc.querySelectorAll('*')).filter(el => 
            el.textContent.trim() === 'Engels' || el.textContent.trim() === 'English'
        );
        
        const dutchElements = Array.from(doc.querySelectorAll('*')).filter(el => 
            el.textContent.trim() === 'Nederlands' || el.textContent.trim() === 'Dutch'
        );
        
        if (englishElements.length > 0 && dutchElements.length > 0) {
            // If we found language indicators, look for nearby text elements
            const englishParent = findCommonAncestor(englishElements[0], 5);
            const dutchParent = findCommonAncestor(dutchElements[0], 5);
            
            if (englishParent && dutchParent) {
                // Get all text elements near the English indicator
                const englishTexts = Array.from(englishParent.querySelectorAll('*'))
                    .map(el => el.textContent.trim())
                    .filter(text => text && text.length > 1 && text !== 'Engels' && text !== 'English');
                
                // Get all text elements near the Dutch indicator
                const dutchTexts = Array.from(dutchParent.querySelectorAll('*'))
                    .map(el => el.textContent.trim())
                    .filter(text => text && text.length > 1 && text !== 'Nederlands' && text !== 'Dutch');
                
                // Match English and Dutch texts by position
                const maxPairs = Math.min(englishTexts.length, dutchTexts.length);
                for (let i = 0; i < maxPairs; i++) {
                    flashcards.push({
                        term: englishTexts[i],
                        definition: dutchTexts[i]
                    });
                }
            }
        }
    }
    
    // Method 4: Look for numbered elements that might be flashcards
    if (flashcards.length === 0 || (totalFlashcards > 0 && flashcards.length < totalFlashcards)) {
        // Look for elements with numbers that might indicate flashcard order
        const numberedElements = Array.from(doc.querySelectorAll('*')).filter(el => {
            const text = el.textContent.trim();
            // Look for elements with just numbers (like "1", "2", etc.)
            return /^\d+$/.test(text);
        });
        
        if (numberedElements.length > 0) {
            // Sort by numeric value
            numberedElements.sort((a, b) => {
                return parseInt(a.textContent.trim()) - parseInt(b.textContent.trim());
            });
            
            // For each numbered element, look for nearby text that might be flashcard content
            numberedElements.forEach(numEl => {
                let parent = numEl.parentElement;
                if (!parent) return;
                
                // Look for text elements near the number
                const nearbyTexts = Array.from(parent.querySelectorAll('*'))
                    .map(el => el.textContent.trim())
                    .filter(text => text && text.length > 1 && !/^\d+$/.test(text));
                
                // If we found at least two text elements, assume they're a term-definition pair
                if (nearbyTexts.length >= 2) {
                    flashcards.push({
                        term: nearbyTexts[0],
                        definition: nearbyTexts[1]
                    });
                }
            });
        }
    }
    
    // Remove duplicates
    const uniqueFlashcards = [];
    const seen = new Set();
    
    flashcards.forEach(card => {
        const key = `${card.term}|${card.definition}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueFlashcards.push(card);
        }
    });
    
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
}

// Display flashcards in the table
function displayFlashcards(flashcards) {
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
}

// Edit flashcard
function editFlashcard(event) {
    const index = parseInt(event.target.dataset.index);
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
            
            // Update CSV preview
            updateCsvPreview();
        }
    }
}

// Delete flashcard
function deleteFlashcard(event) {
    const index = parseInt(event.target.dataset.index);
    
    if (confirm('Are you sure you want to delete this flashcard?')) {
        // Remove from data array
        flashcardsData.splice(index, 1);
        
        // Redisplay flashcards
        displayFlashcards(flashcardsData);
        updateLanguageDisplay(); // Update card count
    }
}

// Convert flashcards to CSV format
function convertToCsv(flashcards) {
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
}

// Copy CSV to clipboard
function copyAsCsv() {
    const csv = convertToCsv(flashcardsData);
    
    navigator.clipboard.writeText(csv)
        .then(() => {
            alert('CSV copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy CSV:', err);
            alert('Failed to copy CSV. Please try again or use the download option.');
        });
}

// Download CSV file
function downloadCsv() {
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
}

// Helper functions
function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

function showError(message) {
    errorMessage.querySelector('p').textContent = message;
    errorMessage.classList.remove('hidden');
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

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
