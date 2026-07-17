export default defineBackground(() => {
  // No popup: clicking the toolbar icon fires action.onClicked, which grants
  // activeTab for that tab (openPanelOnActionClick would bypass this grant).
  // We open the side panel from the click so it inherits the grant, then ping
  // the panel to re-read the now-accessible tab. Chrome only (Firefox uses
  // sidebar_action and has no sidePanel API).
  //
  // Reach the raw chrome.sidePanel.open via globalThis (chrome isn't typed
  // here) rather than the promisified browser.sidePanel. sidePanel.open must be
  // called synchronously inside the click's user-gesture window; the polyfill
  // wraps the call in a promise, deferring it a microtask, which loses the
  // gesture and makes open() throw "may only be called in response to a user
  // gesture".
  const chromeApi = (
    globalThis as unknown as {
      chrome?: { sidePanel?: { open(opts: { windowId?: number; tabId?: number }): Promise<void> } };
    }
  ).chrome;

  browser.action.onClicked.addListener((tab) => {
    if (chromeApi?.sidePanel && tab.windowId != null) {
      chromeApi.sidePanel.open({ windowId: tab.windowId }).catch((err) => console.error('sidePanel.open failed', err));
    }
    // Re-read the current tab. On first open the panel isn't listening yet
    // (its mount extraction covers that); on later clicks this refreshes it.
    browser.runtime.sendMessage({ type: 'jobfit:reextract' }).catch(() => {});
  });
});
