const YOUTUBE_URL = 'https://www.youtube.com/';
// The same sign-in URL YouTube's own "Sign in" button uses.
const LOGIN_URL = 'https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue='
  + encodeURIComponent('https://www.youtube.com/signin?action_handle_signin=true&next=%2F');
const FRAME_RULE_ID = 1;
const ROTATE_RULE_ID = 2;
// Google's account pages are included because YouTube routes signed-in visits through them.
const FRAME_DOMAINS = ['youtube.com', 'accounts.google.com', 'consent.google.com'];
// Google sets several cookies across redirects; let sign-in finish before closing its tab.
const LOGIN_SETTLE_MS = 1500;

const frame = document.getElementById('youtube');
const loginBar = document.getElementById('login-bar');
const redirectBar = document.getElementById('redirect-bar');
const redirectText = document.getElementById('redirect-text');

let loggedIn = false;
let loginTabId = null;
let frameUrl = null;

// YouTube sends X-Frame-Options / CSP, which stop it loading in an iframe.
// Strip them only for frames outside any tab (tabId -1 = the side panel),
// so normal tabs and every other site keep their headers untouched.
async function allowFramingInPanel() {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [FRAME_RULE_ID, ROTATE_RULE_ID],
    addRules: [{
      // Signed-in YouTube embeds this hidden cookie-refresh page; inside the panel it crashes
      // the YouTube renderer (Chrome CHECK failure). Normal tabs still refresh the shared cookies.
      id: ROTATE_RULE_ID,
      priority: 2,
      action: { type: 'block' },
      condition: {
        urlFilter: '||accounts.youtube.com/RotateCookiesPage',
        resourceTypes: ['sub_frame'],
        tabIds: [chrome.tabs.TAB_ID_NONE],
      },
    }, {
      id: FRAME_RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'x-frame-options', operation: 'remove' },
          { header: 'content-security-policy', operation: 'remove' },
        ],
      },
      condition: {
        requestDomains: FRAME_DOMAINS,
        resourceTypes: ['sub_frame'],
        tabIds: [chrome.tabs.TAB_ID_NONE],
      },
    }],
  });
}

// SAPISID on youtube.com exists only while signed in (YouTube's own scripts rely on it).
async function checkLoggedIn() {
  const cookie = await chrome.cookies.get({ url: YOUTUBE_URL, name: 'SAPISID' });
  return Boolean(cookie);
}

function loadYouTube() {
  redirectBar.hidden = true;
  frame.src = YOUTUBE_URL;
}

// Track where our iframe ends up: it's the direct child of the panel document (frame 0).
// Redirects reveal their target even on hosts this extension can't see.
const isPanelFrame = (details) => details.tabId === chrome.tabs.TAB_ID_NONE && details.parentFrameId === 0;
const frameFilter = { urls: FRAME_DOMAINS.map((domain) => `https://*.${domain}/*`), types: ['sub_frame'] };
chrome.webRequest.onBeforeRequest.addListener((details) => {
  if (isPanelFrame(details)) frameUrl = details.url;
}, frameFilter);
chrome.webRequest.onBeforeRedirect.addListener((details) => {
  if (isPanelFrame(details)) frameUrl = details.redirectUrl;
}, frameFilter);

// If YouTube sent the panel somewhere that refuses to be embedded, say where
// instead of leaving Chrome's gray "blocked" page.
frame.addEventListener('load', () => {
  const host = frameUrl ? new URL(frameUrl).hostname : '';
  const allowed = FRAME_DOMAINS.some((domain) => host === domain || host.endsWith('.' + domain));
  redirectBar.hidden = !host || allowed;
  if (!redirectBar.hidden) {
    redirectText.textContent = `YouTube sent the panel to ${host}, which can't load here.`;
    console.warn('Panel frame blocked at', frameUrl);
  }
});

async function init() {
  await allowFramingInPanel();
  loggedIn = await checkLoggedIn();
  loginBar.hidden = loggedIn;
  loadYouTube();
}

// Sign in in a normal tab: Google sign-in refuses to run inside frames.
document.getElementById('login').addEventListener('click', async () => {
  const tab = await chrome.tabs.create({ url: LOGIN_URL });
  loginTabId = tab.id;
});

document.getElementById('dismiss').addEventListener('click', () => {
  loginBar.hidden = true;
});

document.getElementById('open-tab').addEventListener('click', () => {
  chrome.tabs.create({ url: frameUrl || YOUTUBE_URL });
});

document.getElementById('retry').addEventListener('click', loadYouTube);

// Cookie updates fire as remove+add, so re-check state instead of trusting the event.
chrome.cookies.onChanged.addListener(async ({ cookie }) => {
  if (cookie.name !== 'SAPISID' || !cookie.domain.endsWith('youtube.com')) return;

  const nowLoggedIn = await checkLoggedIn();
  if (nowLoggedIn === loggedIn) return;
  loggedIn = nowLoggedIn;
  loginBar.hidden = loggedIn;

  if (loggedIn) {
    setTimeout(() => {
      loadYouTube();
      if (loginTabId !== null) {
        chrome.tabs.remove(loginTabId).catch(() => {});
        loginTabId = null;
      }
    }, LOGIN_SETTLE_MS);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'reload') loadYouTube();
});

init().catch((error) => {
  console.error(error);
  loadYouTube();
});
