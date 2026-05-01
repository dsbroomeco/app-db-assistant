/**
 * Auto-updater module — handles checking for updates and prompting the user.
 * Uses electron-updater to download and install updates from GitHub Releases.
 * Runs in the main process only.
 */

import { BrowserWindow, dialog } from "electron";

let autoUpdater: typeof import("electron-updater").autoUpdater | null = null;

/** Initialize the auto-updater. Only runs in packaged builds. */
export async function initAutoUpdater(mainWindow: BrowserWindow): Promise<void> {
  // electron-updater is ESM, dynamic import needed
  const { autoUpdater: updater } = await import("electron-updater");
  autoUpdater = updater;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", async (info) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update Available",
      message: `A new version (${info.version}) is available. Would you like to download it?`,
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater?.downloadUpdate();
    }
  });

  autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update Ready",
      message: "Update downloaded. The application will restart to install the update.",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater?.quitAndInstall();
    }
  });

  autoUpdater.on("error", () => {
    // Silently ignore update errors — don't disrupt the user
  });

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater?.checkForUpdates().catch(() => {
      // Ignore check errors (e.g., offline)
    });
  }, 5000);
}

/** Manually trigger an update check. */
export async function checkForUpdates(): Promise<void> {
  if (!autoUpdater) return;
  await autoUpdater.checkForUpdates();
}
