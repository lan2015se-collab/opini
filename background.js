const API_URL = 'https://free.v36.cm/v1/chat/completions';
const API_KEY = 'sk-xvowcY9bmQsc6i4oC7B20dB29a44441a8844B157516a15E2';
const GITHUB_REPO = 'lan2015se-collab/opini';

let currentUser = null;

// 每秒同步一次資料
setInterval(async () => {
  if (currentUser) {
    await syncDataToGitHub();
  }
}, 1000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login' || request.action === 'register') {
    handleAuth(request).then(res => sendResponse(res));
    return true;
  }

  if (request.action === 'getAiSummary') {
    fetchSummary(request.prompt).then(summary => {
      sendResponse({ success: true, summary: summary });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
  
  if (request.action === 'addToOpiniMusic') {
    chrome.storage.local.get(['opini_music'], (data) => {
      const songs = data.opini_music || [];
      if (!songs.some(s => s.url === request.url)) {
        songs.unshift({ title: request.title, url: request.url, artist: 'YouTube' });
        chrome.storage.local.set({ opini_music: songs }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }
});

async function handleAuth(data) {
  // 這裡簡化為本地存儲模擬，實際會對接 GitHub Data
  const { username, password } = data;
  if (data.action === 'register') {
    currentUser = { username, password };
    await chrome.storage.local.set({ currentUser });
    return { success: true };
  } else {
    const local = await chrome.storage.local.get(['currentUser']);
    if (local.currentUser && local.currentUser.username === username && local.currentUser.password === password) {
      currentUser = local.currentUser;
      return { success: true };
    }
    return { success: false, error: '帳號或密碼錯誤' };
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
        messages: [
          { role: 'system', content: '你是一個專業的影片分析助手。請根據提供的資訊回答：發布者、影片時長、以及內容核心摘要。' },
          { role: 'user', content: prompt }
        ]
      })
    });
    const data = await response.json();
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      throw new Error('API 回傳格式不正確');
    }
  } catch (e) {
    throw e;
  }
}

async function syncDataToGitHub() {
  const storage = await chrome.storage.local.get(['opini_links', 'opini_music']);
  const userData = {
    user: currentUser.username,
    links: storage.opini_links || [],
    music: storage.opini_music || []
  };

  // 這裡使用 GitHub API 儲存至 data/username.json
  // 注意：實際生產環境需要 GitHub Token，這裡假設擴充功能已獲得授權或透過後端處理
  console.log('正在同步資料至 GitHub...', userData);
}
