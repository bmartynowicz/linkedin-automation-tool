const { ipcRenderer } = require('electron');

// Initialize settings on page load
document.addEventListener('DOMContentLoaded', async () => {
    const settings = await ipcRenderer.invoke('get-settings');
    applySettings(settings);
    updatePromptPreview();
});

// Apply settings to the UI
function applySettings(settings) {
    // Personal Settings
    document.getElementById('theme').value = settings.theme || 'system';
    document.getElementById('notifications').checked = settings.notifications || false;
    document.getElementById('notification-frequency').value = settings.notificationFrequency || 'realtime';
    document.getElementById('language').value = settings.language || 'en';
    document.getElementById('data-sharing').checked = settings.dataSharing || false;
    document.getElementById('auto-logout').checked = settings.autoLogout || false;
    document.getElementById('save-session').checked = settings.saveSession || false;
    document.getElementById('font-size').value = settings.fontSize || 16;
    document.getElementById('text-to-speech').checked = settings.textToSpeech || false;

    // AI Customization
    document.getElementById('tone').value = settings.tone || 'friendly';
    document.getElementById('content-type').value = settings.contentType || 'linkedin-post';
    document.getElementById('writing-style').value = settings.writingStyle || 'brief';
    document.getElementById('engagement-focus').value = settings.engagementFocus || 'comments';
    document.getElementById('content-perspective').value = settings.contentPerspective || 'first-person';
    document.getElementById('vocabulary-level').value = settings.vocabularyLevel || 'simplified';
    document.getElementById('emphasis-tags').value = settings.emphasisTags || '';
}

// Save settings on button click
document.getElementById('save-settings').addEventListener('click', () => {
    const settings = collectSettings();
    ipcRenderer.invoke('save-settings', settings)
        .then(() => alert('Settings saved successfully!'))
        .catch((err) => console.error('Error saving settings:', err));
});

// Collect settings from the UI
function collectSettings() {
    return {
        // Personal Settings
        theme: document.getElementById('theme').value,
        notifications: document.getElementById('notifications').checked,
        notificationFrequency: document.getElementById('notification-frequency').value,
        language: document.getElementById('language').value,
        dataSharing: document.getElementById('data-sharing').checked,
        autoLogout: document.getElementById('auto-logout').checked,
        saveSession: document.getElementById('save-session').checked,
        fontSize: document.getElementById('font-size').value,
        textToSpeech: document.getElementById('text-to-speech').checked,

        // AI Customization
        tone: document.getElementById('tone').value,
        contentType: document.getElementById('content-type').value,
        writingStyle: document.getElementById('writing-style').value,
        engagementFocus: document.getElementById('engagement-focus').value,
        contentPerspective: document.getElementById('content-perspective').value,
        vocabularyLevel: document.getElementById('vocabulary-level').value,
        emphasisTags: document.getElementById('emphasis-tags').value,
    };
}

// Update the live prompt preview
function updatePromptPreview() {
    const tone = document.getElementById('tone').value;
    const contentType = document.getElementById('content-type').value;
    const writingStyle = document.getElementById('writing-style').value;
    const engagementFocus = document.getElementById('engagement-focus').value;
    const perspective = document.getElementById('content-perspective').value;
    const vocabulary = document.getElementById('vocabulary-level').value;
    const emphasis = document.getElementById('emphasis-tags').value || 'no specific tags';

    const prompt = `Generate a ${tone} ${contentType} emphasizing ${engagementFocus}, written in a ${writingStyle} style from a ${perspective} perspective, with a ${vocabulary} vocabulary level, focusing on ${emphasis}.`;
    document.getElementById('prompt-preview').textContent = prompt;
}

// Restore default settings
document.getElementById('restore-defaults').addEventListener('click', () => {
    const defaultSettings = {
        theme: 'system',
        notifications: false,
        notificationFrequency: 'realtime',
        language: 'en',
        dataSharing: false,
        autoLogout: false,
        saveSession: false,
        fontSize: 16,
        textToSpeech: false,
        tone: 'friendly',
        contentType: 'linkedin-post',
        writingStyle: 'brief',
        engagementFocus: 'comments',
        contentPerspective: 'first-person',
        vocabularyLevel: 'simplified',
        emphasisTags: '',
    };
    applySettings(defaultSettings);
    updatePromptPreview();
    alert('Defaults restored!');
});

// Update prompt preview dynamically
document.querySelectorAll('select, input').forEach((element) => {
    element.addEventListener('change', updatePromptPreview);
});
