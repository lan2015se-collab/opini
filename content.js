function injectOpiniButtons() {
  const subscribeBtn = document.querySelector('yt-formatted-string[aria-label*="訂閱"]') || 
                       document.querySelector('button[aria-label*="Subscribe"]') ||
                       document.querySelector('button[aria-label*="訂閱"]') ||
                       document.querySelector('#subscribe-button');
  
  if (subscribeBtn && !document.getElementById('opini-btn-group')) {
    const container = subscribeBtn.closest('div[class*="style-scope"]') || subscribeBtn.parentElement;
    
    if (container) {
      const btnGroup = document.createElement('div');
      btnGroup.id = 'opini-btn-group';
      btnGroup.style.display = 'inline-flex';
      btnGroup.style.marginLeft = '8px';
      btnGroup.style.gap = '8px';

      // 按鈕 1: 新增到 OpiniMusic
      const addBtn = document.createElement('button');
      addBtn.textContent = '新增到 OpiniMusic';
      styleButton(addBtn, '#ff0000');
      addBtn.onclick = () => {
        const title = getYTTitle();
        chrome.runtime.sendMessage({
          action: 'addToOpiniMusic',
          title: title,
          url: window.location.href
        }, (res) => {
          if (res && res.success) {
            addBtn.textContent = '✓ 已新增';
            addBtn.style.background = '#00cc00';
            setTimeout(() => {
              addBtn.textContent = '新增到 OpiniMusic';
              styleButton(addBtn, '#ff0000');
            }, 2000);
          }
        });
      };

      // 按鈕 2: AI 總結
      const summaryBtn = document.createElement('button');
      summaryBtn.textContent = 'AI 總結';
      styleButton(summaryBtn, '#0078d4');
      summaryBtn.onclick = () => {
        const title = getYTTitle();
        const channel = document.querySelector('yt-formatted-string.ytd-channel-name a')?.textContent || '未知發布者';
        const duration = document.querySelector('.ytp-time-duration')?.textContent || '未知時長';
        
        showModal('AI 正在分析影片內容...', true);
        
        const prompt = `影片標題: ${title}\n發布者: ${channel}\n影片時長: ${duration}\n請根據以上資訊總結這部影片。`;
        
        chrome.runtime.sendMessage({ action: 'getAiSummary', prompt: prompt }, (res) => {
          if (res && res.success) {
            showModal(res.summary, false);
          } else {
            showModal('分析失敗: ' + (res ? res.error : '未知錯誤'), false);
          }
        });
      };

      btnGroup.appendChild(addBtn);
      btnGroup.appendChild(summaryBtn);
      container.appendChild(btnGroup);
    }
  }
}

function styleButton(btn, color) {
  btn.style.cssText = `
    background: ${color};
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 20px;
    font-weight: 500;
    cursor: pointer;
    font-size: 14px;
    transition: opacity 0.2s;
    font-family: 'Inter', sans-serif;
  `;
  btn.onmouseover = () => btn.style.opacity = '0.8';
  btn.onmouseout = () => btn.style.opacity = '1';
}

function getYTTitle() {
  return document.querySelector('h1.title yt-formatted-string')?.textContent || 
         document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent ||
         document.querySelector('h1 yt-formatted-string')?.textContent ||
         document.title.replace(' - YouTube', '');
}

function showModal(content, isLoading) {
  let modal = document.getElementById('opini-summary-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'opini-summary-modal';
    modal.style.cssText = `
      position: fixed; top: 20%; right: 20px; width: 300px; 
      background: #111; color: white; border: 1px solid #444; 
      border-radius: 12px; padding: 15px; z-index: 9999; 
      box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: 'Inter', sans-serif;
    `;
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; padding-bottom:10px;">
      <h3 style="margin:0; font-size:16px;">🎬 影片 AI 總結</h3>
      <button id="opini-modal-close" style="background:none; border:none; color:white; font-size:24px; cursor:pointer; line-height:1;">&times;</button>
    </div>
    <div id="opini-summary-content" style="margin:15px 0; line-height:1.6; font-size:14px; max-height:300px; overflow-y:auto;">
      ${content.replace(/\n/g, '<br>')}
    </div>
    ${isLoading ? '<p style="text-align:center; font-size:12px; color:#aaa;">⏳ 正在呼叫 AI 分析中...</p>' : ''}
  `;

  document.getElementById('opini-modal-close').onclick = () => modal.remove();
}

// 監聽頁面變化
const observer = new MutationObserver(injectOpiniButtons);
observer.observe(document.body, { childList: true, subtree: true });
injectOpiniButtons();
