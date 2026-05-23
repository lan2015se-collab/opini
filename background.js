const API_URL = 'https://free.v36.cm/v1/chat/completions';
const API_KEY = 'sk-xvowcY9bmQsc6i4oC7B20dB29a44441a8844B157516a15E2';
const GITHUB_DATA_REPO = 'lan2015se-collab/opini-data';

let GITHUB_TOKEN = '';
let currentUser = null;

chrome.storage.local.get(['githubToken', 'currentUser'], (data) => {
  if (data.githubToken) GITHUB_TOKEN = data.githubToken;
  if (data.currentUser) currentUser = data.currentUser;
});

// 定時同步
setInterval(async () => {
  if (currentUser && GITHUB_TOKEN) {
    await syncDataToGitHub();
  }
}, 10000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TOKEN_UPDATED") {
    GITHUB_TOKEN = request.token;
    return;
  }
  
  if (request.action === 'getAiSummary') {
    fetchSummary(request.prompt).then(summary => {
      sendResponse({ success: true, summary: summary });
    });
    return true;
  }

  if (request.action === 'addToOpiniMusic') {
    saveToMusic(request.title, request.url).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

async function saveToMusic(title, url) {
  const res = await chrome.storage.local.get('music');
  const music = res.music || [];
  if (!music.some(m => m.url === url)) {
    music.unshift({ title, url, date: new Date().toLocaleString() });
    await chrome.storage.local.set({ music });
    await syncDataToGitHub();
  }
}

async function fetchSummary(prompt) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e) {
    return "AI 總結暫時無法使用: " + e.message;
  }
}

async function syncDataToGitHub() {
  if (!currentUser || !GITHUB_TOKEN) return;
  try {
    const storage = await chrome.storage.local.get(['urls', 'music', 'clips', 'ytsage']);
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(storage, null, 2))));
    const path = `data/${currentUser}.json`;
    const url = `https://api.github.com/repos/${GITHUB_DATA_REPO}/contents/${path}`;
    
    let sha = null;
    const res = await fetch(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
    if (res.ok) {
      const fileData = await res.json();
      sha = fileData.sha;
    }

    await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Sync for ${currentUser}`, content, sha })
    });
  } catch (e) { console.error('Sync error:', e); }
}
