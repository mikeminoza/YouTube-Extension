const YOUTUBE_URL = 'https://www.youtube.com/';
// The same sign-in URL YouTube's own "Sign in" button uses.
const LOGIN_URL = 'https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue='
  + encodeURIComponent('https://www.youtube.com/signin?action_handle_signin=true&next=%2F');

// Clicking the toolbar icon opens the side panel.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'popout', title: 'Pop out as mini window', contexts: ['action'] });
    chrome.contextMenus.create({ id: 'reload', title: 'Reload YouTube panel', contexts: ['action'] });
    chrome.contextMenus.create({ id: 'login', title: 'Log in / switch account', contexts: ['action'] });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  switch (info.menuItemId) {
    case 'popout':
      // A real top-level window: no header changes involved, keeps playing when the panel closes.
      chrome.windows.create({ url: YOUTUBE_URL, type: 'popup', width: 480, height: 760 });
      break;
    case 'reload':
      // Fails harmlessly when the panel isn't open.
      chrome.runtime.sendMessage({ type: 'reload' }).catch(() => {});
      break;
    case 'login':
      chrome.tabs.create({ url: LOGIN_URL });
      break;
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-panel' && tab) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
  }
});
