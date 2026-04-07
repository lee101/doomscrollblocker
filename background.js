const MEDIA_BLOCK_RULE_ID = 1;

const DEFAULT_SITES = [
  'youtube.com',
  'x.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'linkedin.com'
];

async function updateMediaBlockRules(settings) {
  if (!chrome.declarativeNetRequest) return;

  const addRules = [];
  if (settings && settings.blockAllMedia) {
    const allBlockedSites = [
      ...(settings.sites || []),
      ...(settings.customSites || [])
    ];
    if (allBlockedSites.length > 0) {
      addRules.push({
        id: MEDIA_BLOCK_RULE_ID,
        priority: 1,
        action: { type: 'block' },
        condition: {
          initiatorDomains: allBlockedSites,
          resourceTypes: ['image', 'media', 'object']
        }
      });
    }
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [MEDIA_BLOCK_RULE_ID],
      addRules
    });
  } catch (e) {}
}

chrome.runtime.onInstalled.addListener(() => {
  const defaultSettings = {
    enabled: true,
    sites: DEFAULT_SITES,
    volume: 50,
    delay: 100,
    blurMedia: true,
    heavyBlur: false,
    shrinkMedia: false,
    blockAllMedia: false
  };

  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: defaultSettings }, () => {
        updateMediaBlockRules(defaultSettings);
      });
    } else {
      updateMediaBlockRules(result.settings);
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'settingsUpdated') {
    updateMediaBlockRules(message.settings);
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id !== sender.tab?.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      });
    });
  }
});
