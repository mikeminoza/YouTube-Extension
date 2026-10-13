// TEMPORARY diagnostics for the blank-panel bug. Once fixed, delete this file, its <script> tag in
// sidepanel.html, and the "storage", "declarativeNetRequestFeedback", "webNavigation" and "<all_urls>"
// manifest entries.
const diag = [];
let saveTimer = null;

function log(...entry) {
  diag.push([Date.now() % 1000000, ...entry.map((x) => (typeof x === 'string' ? x.slice(0, 300) : x))]);
  if (diag.length > 300) diag.shift();
  console.info('[diag]', ...entry);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => chrome.storage.local.set({ diag }), 300);
}

// tabId -1 = not a tab, i.e. this side panel's frames.
const inPanel = (d) => d.tabId === chrome.tabs.TAB_ID_NONE;
const frames = { urls: ['<all_urls>'], types: ['sub_frame'] };
const relevant = (headers) => (headers || [])
  .filter((h) => /frame-options|security-policy|cross-origin|^location$|content-type/i.test(h.name))
  .map((h) => `${h.name}: ${(h.value || '').slice(0, 200)}`);

chrome.webRequest.onBeforeRequest.addListener((d) => {
  if (inPanel(d)) log('request', d.url, `frame ${d.frameId} parent ${d.parentFrameId}`, d.initiator || '');
}, frames);
chrome.webRequest.onBeforeRedirect.addListener((d) => {
  if (inPanel(d)) log('redirect', d.url, d.statusCode, '->', d.redirectUrl);
}, frames);
chrome.webRequest.onHeadersReceived.addListener((d) => {
  if (inPanel(d)) log('headers', d.url, d.statusCode, d.fromCache ? 'cache' : 'net', ...relevant(d.responseHeaders));
}, frames, ['responseHeaders', 'extraHeaders']);
chrome.webRequest.onCompleted.addListener((d) => {
  if (inPanel(d)) log('completed', d.url, d.statusCode);
}, frames);
chrome.webRequest.onErrorOccurred.addListener((d) => {
  if (inPanel(d)) log('error', d.url, d.error);
}, frames);
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  log('rule matched', info.rule.ruleId, info.request.url, `tab ${info.request.tabId}`, info.request.type);
});
for (const event of ['onBeforeNavigate', 'onCommitted', 'onErrorOccurred']) {
  chrome.webNavigation[event].addListener((d) => {
    if (inPanel(d)) log('nav ' + event, d.url, `frame ${d.frameId}`, d.error || '');
  });
}

document.getElementById('youtube').addEventListener('load', (event) => {
  let childFrames = 'unknown';
  try { childFrames = event.target.contentWindow.length; } catch {}
  log('iframe load event', `child frames: ${childFrames}`);
});
window.addEventListener('error', (event) => log('page error', event.message));

chrome.storage.local.set({ diag: [] });
log('start', chrome.runtime.getManifest().version, navigator.userAgent);
chrome.cookies.get({ url: 'https://www.youtube.com/', name: 'SAPISID' })
  .then((cookie) => log('signed in to youtube', Boolean(cookie)));
setTimeout(async () => {
  log('session rules', JSON.stringify(await chrome.declarativeNetRequest.getSessionRules()));
}, 1500);
