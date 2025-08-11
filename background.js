chrome.runtime.onInstalled.addListener(() => {
  const defaultSettings = {
    enabled: true,
    sites: [
      'youtube.com',
      'x.com',
      'twitter.com',
      'facebook.com',
      'instagram.com',
      'tiktok.com',
      'reddit.com',
      'linkedin.com'
    ],
    volume: 50,
    delay: 100
  };
  
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: defaultSettings });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'settingsUpdated') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id !== sender.tab?.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      });
    });
  }
});