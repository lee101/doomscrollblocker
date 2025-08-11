const mainSocialNetworks = [
  { domain: 'youtube.com', name: 'YouTube', icon: '📺' },
  { domain: 'x.com', name: 'X (Twitter)', icon: '🐦' },
  { domain: 'twitter.com', name: 'Twitter', icon: '🐦' },
  { domain: 'facebook.com', name: 'Facebook', icon: '👤' },
  { domain: 'instagram.com', name: 'Instagram', icon: '📷' },
  { domain: 'tiktok.com', name: 'TikTok', icon: '🎵' },
  { domain: 'reddit.com', name: 'Reddit', icon: '🤖' },
  { domain: 'linkedin.com', name: 'LinkedIn', icon: '💼' }
];

let settings = {
  enabled: true,
  sites: mainSocialNetworks.map(s => s.domain),
  customSites: [],
  volume: 50,
  delay: 100,
  blurMedia: true
};

async function loadSettings() {
  const stored = await chrome.storage.sync.get(['settings']);
  if (stored.settings) {
    if (stored.settings.sites && !stored.settings.customSites) {
      const mainDomains = mainSocialNetworks.map(s => s.domain);
      stored.settings.customSites = stored.settings.sites.filter(s => !mainDomains.includes(s));
      stored.settings.sites = stored.settings.sites.filter(s => mainDomains.includes(s));
    }
    settings = { ...settings, ...stored.settings };
  } else {
    await saveSettings();
  }
  updateUI();
}

async function saveSettings() {
  await chrome.storage.sync.set({ settings });
  chrome.runtime.sendMessage({ type: 'settingsUpdated', settings });
}

function getAllBlockedSites() {
  return [...settings.sites, ...settings.customSites];
}

function updateUI() {
  document.getElementById('enabled').checked = settings.enabled;
  document.getElementById('status').textContent = settings.enabled ? 'Enabled' : 'Disabled';
  document.getElementById('volume').value = settings.volume;
  document.getElementById('volumeValue').textContent = settings.volume + '%';
  document.getElementById('delay').value = settings.delay;
  document.getElementById('blurMedia').checked = settings.blurMedia !== false;
  
  renderMainSites();
  renderCustomSites();
}

function renderMainSites() {
  const container = document.getElementById('mainSitesList');
  container.innerHTML = '';
  
  mainSocialNetworks.forEach(network => {
    const siteDiv = document.createElement('div');
    siteDiv.className = 'main-site-item';
    
    const leftSection = document.createElement('div');
    leftSection.className = 'site-info';
    
    const icon = document.createElement('span');
    icon.className = 'site-icon';
    icon.textContent = network.icon;
    
    const siteName = document.createElement('span');
    siteName.className = 'site-name';
    siteName.textContent = network.name;
    
    const domainSpan = document.createElement('span');
    domainSpan.className = 'site-domain';
    domainSpan.textContent = `(${network.domain})`;
    
    leftSection.appendChild(icon);
    leftSection.appendChild(siteName);
    leftSection.appendChild(domainSpan);
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'mini-switch';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = settings.sites.includes(network.domain);
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (!settings.sites.includes(network.domain)) {
          settings.sites.push(network.domain);
        }
      } else {
        settings.sites = settings.sites.filter(s => s !== network.domain);
      }
      saveSettings();
    });
    
    const slider = document.createElement('span');
    slider.className = 'mini-slider';
    
    toggleSwitch.appendChild(checkbox);
    toggleSwitch.appendChild(slider);
    
    siteDiv.appendChild(leftSection);
    siteDiv.appendChild(toggleSwitch);
    container.appendChild(siteDiv);
  });
}

function renderCustomSites() {
  const container = document.getElementById('customSitesList');
  container.innerHTML = '';
  
  if (settings.customSites.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = 'No custom sites added yet';
    container.appendChild(emptyMsg);
    return;
  }
  
  settings.customSites.forEach(site => {
    const siteDiv = document.createElement('div');
    siteDiv.className = 'site-item';
    
    const siteName = document.createElement('span');
    siteName.textContent = site;
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => removeCustomSite(site);
    
    siteDiv.appendChild(siteName);
    siteDiv.appendChild(removeBtn);
    container.appendChild(siteDiv);
  });
}

function removeCustomSite(site) {
  settings.customSites = settings.customSites.filter(s => s !== site);
  saveSettings();
  renderCustomSites();
}

function addSite() {
  const input = document.getElementById('newSite');
  let site = input.value.trim();
  
  if (!site) return;
  
  site = site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  
  const mainDomains = mainSocialNetworks.map(s => s.domain);
  if (mainDomains.includes(site)) {
    alert('This is a main social network. Use the toggle above to enable/disable it.');
    input.value = '';
    return;
  }
  
  if (!settings.customSites.includes(site)) {
    settings.customSites.push(site);
    saveSettings();
    renderCustomSites();
  }
  
  input.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  document.getElementById('enabled').addEventListener('change', (e) => {
    settings.enabled = e.target.checked;
    document.getElementById('status').textContent = settings.enabled ? 'Enabled' : 'Disabled';
    saveSettings();
  });
  
  document.getElementById('volume').addEventListener('input', (e) => {
    settings.volume = parseInt(e.target.value);
    document.getElementById('volumeValue').textContent = settings.volume + '%';
    saveSettings();
  });
  
  document.getElementById('delay').addEventListener('change', (e) => {
    settings.delay = parseInt(e.target.value);
    saveSettings();
  });
  
  document.getElementById('addSite').addEventListener('click', addSite);
  
  document.getElementById('newSite').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
  });
  
  document.getElementById('testSound').addEventListener('click', () => {
    const audio = new Audio('annoying.mp3');
    audio.volume = settings.volume / 100;
    audio.play();
  });
  
  document.getElementById('blurMedia').addEventListener('change', (e) => {
    settings.blurMedia = e.target.checked;
    saveSettings();
  });
});