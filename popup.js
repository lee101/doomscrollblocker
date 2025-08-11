const defaultSites = [
  'youtube.com',
  'x.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'linkedin.com'
];

let settings = {
  enabled: true,
  sites: defaultSites,
  volume: 50,
  delay: 100,
  blurMedia: true
};

async function loadSettings() {
  const stored = await chrome.storage.sync.get(['settings']);
  if (stored.settings) {
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

function updateUI() {
  document.getElementById('enabled').checked = settings.enabled;
  document.getElementById('status').textContent = settings.enabled ? 'Enabled' : 'Disabled';
  document.getElementById('volume').value = settings.volume;
  document.getElementById('volumeValue').textContent = settings.volume + '%';
  document.getElementById('delay').value = settings.delay;
  document.getElementById('blurMedia').checked = settings.blurMedia !== false;
  
  renderSitesList();
}

function renderSitesList() {
  const container = document.getElementById('sitesList');
  container.innerHTML = '';
  
  settings.sites.forEach(site => {
    const siteDiv = document.createElement('div');
    siteDiv.className = 'site-item';
    
    const siteName = document.createElement('span');
    siteName.textContent = site;
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => removeSite(site);
    
    siteDiv.appendChild(siteName);
    siteDiv.appendChild(removeBtn);
    container.appendChild(siteDiv);
  });
}

function removeSite(site) {
  settings.sites = settings.sites.filter(s => s !== site);
  saveSettings();
  renderSitesList();
}

function addSite() {
  const input = document.getElementById('newSite');
  let site = input.value.trim();
  
  if (!site) return;
  
  site = site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  
  if (!settings.sites.includes(site)) {
    settings.sites.push(site);
    saveSettings();
    renderSitesList();
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