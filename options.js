// Saves options to chrome.storage.sync
function saveOptions() {
    const format = document.getElementById('defaultCopyFormat').value;
    chrome.storage.sync.set({
        defaultCopyFormat: format
    }, () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 1500);
    });
}

// Restores select box state using the preferences stored in chrome.storage.
function restoreOptions() {
    // Use default value defaultCopyFormat = 'tab'
    chrome.storage.sync.get({
        defaultCopyFormat: 'tab'
    }, (items) => {
        document.getElementById('defaultCopyFormat').value = items.defaultCopyFormat;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);