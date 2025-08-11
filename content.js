let settings = {
  enabled: true,
  volume: 50,
  delay: 100,
  blurMedia: true
};

let lastSoundTime = 0;
let audio = null;
let processedMedia = new WeakSet();
let backgroundOverlays = new Map();

async function loadSettings() {
  const stored = await chrome.storage.sync.get(['settings']);
  if (stored.settings) {
    settings = stored.settings;
    
    const currentDomain = window.location.hostname.replace(/^www\./, '');
    const isBlocked = settings.sites && settings.sites.some(site => 
      currentDomain.includes(site.replace(/^www\./, ''))
    );
    
    if (!isBlocked) {
      console.log('DoomScroll Blocker: Site not in block list');
      return false;
    }
  }
  return true;
}

function playAnnoyingSound() {
  const now = Date.now();
  if (now - lastSoundTime < settings.delay) {
    return;
  }
  
  if (!settings.enabled) {
    return;
  }
  
  lastSoundTime = now;
  
  if (!audio) {
    audio = new Audio(chrome.runtime.getURL('annoying.mp3'));
  }
  
  audio.volume = Math.min(settings.volume / 100 * 1.5, 1.0);
  audio.currentTime = 0;
  
  audio.play().catch(err => console.log('Audio play failed:', err));
  
  setTimeout(() => {
    const audio2 = new Audio(chrome.runtime.getURL('annoying.mp3'));
    audio2.volume = Math.min(settings.volume / 100 * 1.5, 1.0);
    audio2.play().catch(err => console.log('Second audio play failed:', err));
  }, 250);
}

let isScrolling = false;
let scrollTimeout;

function handleScroll() {
  if (!isScrolling) {
    playAnnoyingSound();
    isScrolling = true;
  }
  
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    isScrolling = false;
  }, 150);
}

function handleWheel(e) {
  if (Math.abs(e.deltaY) > 0) {
    playAnnoyingSound();
  }
}

function handleMediaClick(e) {
  const target = e.currentTarget;
  target.classList.remove('doomscroll-blur');
  target.removeEventListener('click', handleMediaClick);
}

function handleBackgroundOverlayClick(e) {
  const overlay = e.currentTarget;
  const targetElement = overlay.dataset.targetId;
  const element = document.querySelector(`[data-doomscroll-id="${targetElement}"]`);
  
  if (element) {
    element.style.filter = '';
    element.classList.remove('doomscroll-bg-blurred');
  }
  
  overlay.remove();
  backgroundOverlays.delete(targetElement);
}

function createBackgroundOverlay(element) {
  const id = 'doomscroll-' + Math.random().toString(36).substr(2, 9);
  element.dataset.doomscrollId = id;
  
  const rect = element.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.className = 'doomscroll-bg-overlay';
  overlay.dataset.targetId = id;
  overlay.style.position = 'absolute';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  overlay.style.top = rect.top + window.scrollY + 'px';
  overlay.style.left = rect.left + window.scrollX + 'px';
  overlay.style.zIndex = '9999';
  
  overlay.addEventListener('click', handleBackgroundOverlayClick, { once: true });
  document.body.appendChild(overlay);
  backgroundOverlays.set(id, overlay);
  
  element.classList.add('doomscroll-bg-blurred');
}

function updateOverlayPositions() {
  backgroundOverlays.forEach((overlay, id) => {
    const element = document.querySelector(`[data-doomscroll-id="${id}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      overlay.style.top = rect.top + window.scrollY + 'px';
      overlay.style.left = rect.left + window.scrollX + 'px';
    }
  });
}

function blurMedia(element) {
  if (processedMedia.has(element)) return;
  if (!settings.blurMedia) return;
  
  processedMedia.add(element);
  element.classList.add('doomscroll-blur');
  element.addEventListener('click', handleMediaClick, { once: true });
  
  element.style.cursor = 'pointer';
  element.title = 'Click to reveal';
}

function processAllMedia() {
  if (!settings.blurMedia) {
    document.querySelectorAll('.doomscroll-blur').forEach(el => {
      el.classList.remove('doomscroll-blur');
      el.removeEventListener('click', handleMediaClick);
      el.style.cursor = '';
      el.title = '';
    });
    
    document.querySelectorAll('.doomscroll-bg-overlay').forEach(overlay => {
      overlay.remove();
    });
    
    document.querySelectorAll('.doomscroll-bg-blurred').forEach(el => {
      el.style.filter = '';
      el.classList.remove('doomscroll-bg-blurred');
      delete el.dataset.doomscrollId;
    });
    
    processedMedia = new WeakSet();
    backgroundOverlays.clear();
    return;
  }
  
  document.querySelectorAll('img').forEach(img => {
    if (img.width > 50 && img.height > 50) {
      blurMedia(img);
    }
  });
  
  document.querySelectorAll('video').forEach(video => {
    blurMedia(video);
    video.pause();
    video.addEventListener('click', function(e) {
      if (!this.classList.contains('doomscroll-blur')) {
        if (this.paused) {
          this.play();
        } else {
          this.pause();
        }
      }
    });
  });
  
  document.querySelectorAll('picture, svg, canvas').forEach(media => {
    if (media.offsetWidth > 50 && media.offsetHeight > 50) {
      blurMedia(media);
    }
  });
  
  document.querySelectorAll('*').forEach(element => {
    if (processedMedia.has(element)) return;
    
    const computed = window.getComputedStyle(element);
    if (computed.backgroundImage && computed.backgroundImage !== 'none' && computed.backgroundImage !== 'initial') {
      if (element.offsetWidth > 50 && element.offsetHeight > 50) {
        if (!element.dataset.doomscrollId && !element.classList.contains('doomscroll-bg-blurred')) {
          processedMedia.add(element);
          createBackgroundOverlay(element);
        }
      }
    }
  });
  
  updateOverlayPositions();
}

async function init() {
  const shouldRun = await loadSettings();
  if (!shouldRun) return;
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('wheel', handleWheel, { passive: true });
  window.addEventListener('scroll', updateOverlayPositions, { passive: true });
  window.addEventListener('resize', updateOverlayPositions, { passive: true });
  
  document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
  
  processAllMedia();
  
  const mediaObserver = new MutationObserver((mutations) => {
    const scrollableElements = document.querySelectorAll('*');
    scrollableElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.overflow === 'auto' || style.overflow === 'scroll' || 
          style.overflowY === 'auto' || style.overflowY === 'scroll') {
        el.addEventListener('scroll', handleScroll, { passive: true });
      }
    });
    
    processAllMedia();
  });
  
  mediaObserver.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'style', 'class']
  });
  
  setInterval(() => {
    processAllMedia();
    updateOverlayPositions();
  }, 2000);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'settingsUpdated') {
    settings = message.settings;
    processAllMedia();
  }
});

init();