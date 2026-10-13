# YouTube Side Panel

YouTube (www.youtube.com) in Chrome's or Edge's side panel. You sign in once and then watch, search and browse next
to whatever tab you're on.

## Install (Chrome or Edge, unpacked)

1. Open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this `youtube-side-panel` folder.
4. Pin the extension to the toolbar.

## Use

- **Click the toolbar icon** (or press **Alt+Shift+Y**) to open the panel.
- **Not signed in?** Click **Sign in** in the bar at the top. Google sign-in opens in a normal tab, because Google
  refuses to sign in inside a frame. Once you're in, the tab closes and the panel reloads signed in. If you're
  already signed in to YouTube in this browser, the panel is signed in straight away.
- **Right-click the toolbar icon** for:
  - **Pop out as mini window**: YouTube in a small standalone window.
  - **Reload YouTube panel**
  - **Log in / switch account**
- **Too narrow?** Drag the panel's left edge to make it wider.
- **Switch between YouTube and Spotify** by clicking the other extension's toolbar icon.
- The shortcut can be changed at `chrome://extensions/shortcuts`.

## Good to know

- **Closing the side panel stops the video**, because the player lives in the panel. Switching tabs doesn't stop
  it. To keep watching with the panel closed, use **Pop out as mini window** or YouTube's picture-in-picture.
- **How it works:** YouTube sends headers that stop it from loading inside other pages. The extension removes those
  headers **only** for frames inside the side panel (`declarativeNetRequest` session rule with `tabIds: [-1]`), so
  regular tabs and every other site are untouched. Google's account pages (`accounts.google.com`,
  `consent.google.com`) are covered too, because YouTube routes signed-in visits through them.
- **If YouTube sends the panel somewhere else** that refuses to load in a frame, a bar names the page and offers
  **Open in tab** and **Reload**, instead of Chrome's gray "blocked" page.
- **Sign-in detection** looks for YouTube's `SAPISID` cookie. The extension only checks whether the cookie exists;
  it never stores or sends it anywhere.
- This is for personal use. If YouTube changes its site, the panel could stop working; the pop-out window would
  keep working.
