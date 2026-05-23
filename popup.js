document.addEventListener('DOMContentLoaded', async () => {
  // 頁面切換邏輯
  const mainMenu = document.getElementById('main-menu');
  const saverPage = document.getElementById('saver-page');
  const musicPage = document.getElementById('music-page');
  const playerPage = document.getElementById('player-page');

  const showPage = (page) => {
    [mainMenu, saverPage, musicPage, playerPage].forEach(p => p.style.display = 'none');
    page.style.display = 'flex';
  };

  document.getElementById('go-saver').onclick = () => showPage(saverPage);
  document.getElementById('go-music').onclick = () => showPage(musicPage);
  document.querySelectorAll('.back-btn').forEach(btn => btn.onclick = () => showPage(mainMenu));
  document.getElementById('player-back-btn').onclick = () => showPage(musicPage);

  // --- 網址儲存邏輯 ---
  const urlEl = document.getElementById('current-url');
  const nameInput = document.getElementById('custom-name');
  const noteInput = document.getElementById('note-input');
  const saveBtn = document.getElementById('save-btn');
  const savedList = document.getElementById('saved-list');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    urlEl.textContent = tab.url;
    nameInput.value = tab.title;
  }

  const updateSaverList = async () => {
    const data = await chrome.storage.local.get(['opini_links']);
    const links = data.opini_links || [];
    savedList.innerHTML = '';
    links.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'saved-item';
      div.innerHTML = `
        <span class="delete-item" data-type="saver" data-index="${index}">刪除</span>
        <a href="${item.url}" target="_blank">${item.displayName || item.title}</a>
        ${item.note ? `<p class="saved-note">${item.note}</p>` : ''}
      `;
      savedList.appendChild(div);
    });
    bindDeleteEvents();
  };

  saveBtn.onclick = async () => {
    const newLink = { title: tab.title, displayName: nameInput.value.trim() || tab.title, url: tab.url, note: noteInput.value.trim(), timestamp: Date.now() };
    const data = await chrome.storage.local.get(['opini_links']);
    const links = data.opini_links || [];
    links.unshift(newLink);
    await chrome.storage.local.set({ opini_links: links });
    noteInput.value = '';
    updateSaverList();
  };

  // --- OpiniMusic 邏輯 ---
  const musicUrlInput = document.getElementById('music-url-input');
  const analyzeBtn = document.getElementById('analyze-save-btn');
  const musicList = document.getElementById('music-list');
  const loadingStatus = document.getElementById('loading-status');

  const updateMusicList = async () => {
    const data = await chrome.storage.local.get(['opini_music']);
    const songs = data.opini_music || [];
    musicList.innerHTML = '';
    songs.forEach((song, index) => {
      const div = document.createElement('div');
      div.className = 'music-item';
      const isYT = song.url.includes('youtube.com') || song.url.includes('youtu.be');
      
      div.innerHTML = `
        <span class="delete-item" data-type="music" data-index="${index}">刪除</span>
        <span class="song-name">${song.title}</span>
        <p class="music-info">歌手: ${song.artist || '未知'}</p>
        <p class="music-meta">發佈者: ${song.publisher || '未知'} | 公司: ${song.company || '未知'}</p>
        <div class="music-controls">
          ${isYT ? `<button class="play-btn" data-url="${song.url}" data-title="${song.title}">PLAY</button>` : ''}
          ${isYT ? `<button class="go-btn" data-url="${song.url}">GO</button>` : `<button class="link-btn" data-url="${song.url}">前往網站</button>`}
        </div>
      `;
      musicList.appendChild(div);
    });
    bindMusicEvents();
    bindDeleteEvents();
  };

  const analyzeMusic = async (url) => {
    loadingStatus.style.display = 'block';
    // 這裡模擬解析邏輯，實際擴充功能可透過 fetch 網頁標題或 API
    let title = '未知歌曲', artist = '未知歌手', publisher = '未知', company = '未知';
    
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        title = 'YouTube 音樂影片';
        publisher = 'YouTube User';
      } else if (url.includes('spotify.com')) {
        title = 'Spotify 歌曲';
        company = 'Spotify AB';
      } else if (url.includes('apple.com')) {
        title = 'Apple Music 歌曲';
        company = 'Apple Inc.';
      }
    } catch (e) {}

    loadingStatus.style.display = 'none';
    return { title, artist, publisher, company, url, timestamp: Date.now() };
  };

  analyzeBtn.onclick = async () => {
    const url = musicUrlInput.value.trim();
    if (!url) return;
    const songData = await analyzeMusic(url);
    const data = await chrome.storage.local.get(['opini_music']);
    const songs = data.opini_music || [];
    songs.unshift(songData);
    await chrome.storage.local.set({ opini_music: songs });
    musicUrlInput.value = '';
    updateMusicList();
  };

  const bindMusicEvents = () => {
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.onclick = () => {
        const url = btn.getAttribute('data-url');
        const title = btn.getAttribute('data-title');
        let videoId = '';
        if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
        else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
        
        if (videoId) {
          document.getElementById('player-title').textContent = title;
          document.getElementById('yt-player-container').innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
          showPage(playerPage);
        }
      };
    });

    document.querySelectorAll('.go-btn, .link-btn').forEach(btn => {
      btn.onclick = () => window.open(btn.getAttribute('data-url'), '_blank');
    });
  };

  const bindDeleteEvents = () => {
    document.querySelectorAll('.delete-item').forEach(btn => {
      btn.onclick = async (e) => {
        const type = btn.getAttribute('data-type');
        const idx = btn.getAttribute('data-index');
        const key = type === 'saver' ? 'opini_links' : 'opini_music';
        const data = await chrome.storage.local.get([key]);
        const list = data[key] || [];
        list.splice(idx, 1);
        await chrome.storage.local.set({ [key]: list });
        type === 'saver' ? updateSaverList() : updateMusicList();
      };
    });
  };

  document.getElementById('clear-all').onclick = async () => {
    if (confirm('確定清除所有網址紀錄？')) {
      await chrome.storage.local.set({ opini_links: [] });
      updateSaverList();
    }
  };

  updateSaverList();
  updateMusicList();
});
