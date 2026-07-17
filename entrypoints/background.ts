export default defineBackground(() => {
  // With no popup, clicking the toolbar icon opens the side panel (Chrome).
  // Guarded: Firefox uses sidebar_action and has no sidePanel API.
  const sidePanel = (
    browser as unknown as {
      sidePanel?: { setPanelBehavior(opts: { openPanelOnActionClick: boolean }): Promise<void> };
    }
  ).sidePanel;
  sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err: unknown) => console.error('sidePanel.setPanelBehavior failed', err));
});
