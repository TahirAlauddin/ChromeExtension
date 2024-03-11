function communicateWithBackend(data) {
    
    // Define the messaging function
    let queryTabs = chrome.tabs.query;
    let sendMessage = chrome.tabs.sendMessage;

    // Get the currently active tab
    queryTabs({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
            // Correctly use chrome.tabs.sendMessage to send a message to the content script of the tab
            // sendMessage(tabs[0].id, data, function(response) {
            sendMessage(tabs[0].id, data, function(response) {
                if (chrome.runtime.lastError) {
                    console.log("Error sending message: " + chrome.runtime.lastError.message);
                    if (data.action === 'enableExtension') {
                    }
                } else if (response) 
                    console.log(response.status);
            });

        }
    });
}


chrome.storage.sync.get('colorPicked', function(data) {
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.value = data.colorPicked || "#000000"

    communicateWithBackend({'action': 'changeColor', 'color': data.colorPicked})
});
document.getElementById('colorPicker').addEventListener('input', function() {
    let colorValue = this.value; // Cache the color value
    console.log('send it to me baby')
    chrome.storage.sync.set({'colorPicked': this.value});
    
    communicateWithBackend(
        {action: "changeColor", color: colorValue }
    )

});
