'use strict';

/**
 * Preload script — runs in a privileged context before the renderer page loads.
 * Uses contextBridge to safely expose a typed API surface to the renderer.
 * The renderer accesses this as window.electronAPI.
 *
 * Security model:
 * - nodeIntegration is OFF in the renderer
 * - contextIsolation is ON
 * - Only explicitly listed functions are exposed — no raw ipcRenderer access
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** True when running inside the desktop app */
  isDesktop: true,

  // ── App info ──────────────────────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),

  // ── File System ───────────────────────────────────────────────────────────
  /**
   * Open a native Save dialog and write a project file.
   * @param {unknown} data  - Serialisable project data
   * @param {string}  [defaultName] - Suggested filename
   * @returns {{ filePath?: string; cancelled?: boolean }}
   */
  saveProject: (data, defaultName) =>
    ipcRenderer.invoke('fs:save-project', { data, defaultName }),

  /**
   * Open a native Open dialog and read a project file.
   * @returns {{ filePath?: string; data?: unknown; cancelled?: boolean }}
   */
  openProject: () => ipcRenderer.invoke('fs:open-project'),

  /**
   * Export a canvas PNG via a native Save dialog.
   * @param {string} dataUrl     - Canvas data URL (image/png;base64,...)
   * @param {string} [defaultName]
   * @returns {{ filePath?: string; cancelled?: boolean }}
   */
  exportImage: (dataUrl, defaultName) =>
    ipcRenderer.invoke('fs:export-image', { dataUrl, defaultName }),

  /**
   * Export a PDF buffer via a native Save dialog.
   * @param {ArrayBuffer} buffer
   * @param {string} [defaultName]
   * @returns {{ filePath?: string; cancelled?: boolean }}
   */
  exportPdf: (buffer, defaultName) =>
    ipcRenderer.invoke('fs:export-pdf', { buffer, defaultName }),
});
