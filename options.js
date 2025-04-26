// Saves options to browser.storage.sync using Promises
function saveOptions() {
    const format = document.getElementById('defaultCopyFormat').value;
    const saveButton = document.getElementById('save');
    const status = document.getElementById('status');
    const originalButtonText = saveButton.textContent;

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    status.textContent = ''; // Clear previous status

    browser.storage.sync.set({
        defaultCopyFormat: format
    }).then(() => {
        // Update status and button text on success
        saveButton.textContent = 'Saved ✔';
        status.textContent = 'Options saved successfully.';
        status.style.color = 'green'; // Indicate success
        console.log("Options: Settings saved.");
    }).catch((error) => {
        // Update status and button text on error
        saveButton.textContent = 'Error!';
        status.textContent = `Error saving options: ${error.message}`;
        status.style.color = 'red'; // Indicate error
        console.error("Options: Error saving settings:", error);
    }).finally(() => {
        // Restore button state after a delay
        setTimeout(() => {
            saveButton.disabled = false;
            saveButton.textContent = originalButtonText;
            // Optionally clear status message after another delay
            // setTimeout(() => { status.textContent = ''; }, 2000);
        }, 1500); // Keep feedback visible for 1.5 seconds
    });
}

// Restores select box state using the preferences stored in browser.storage.sync
function restoreOptions() {
    // Use default value defaultCopyFormat = 'tab'
    browser.storage.sync.get({
        defaultCopyFormat: 'tab'
    }).then((items) => {
        document.getElementById('defaultCopyFormat').value = items.defaultCopyFormat;
        console.log("Options: Settings restored.");
    }).catch((error) => {
        console.error("Options: Error restoring settings:", error);
        const status = document.getElementById('status');
        status.textContent = 'Error loading saved settings.';
        status.style.color = 'red';
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);