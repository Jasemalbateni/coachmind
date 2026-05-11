/**
 * Desktop API bridge
 *
 * Provides a typed interface to the Electron IPC layer exposed via preload.js.
 * When running in a browser (web mode), all capabilities return graceful
 * no-ops or throw a clear error so callsites can branch on isDesktop().
 *
 * Usage:
 *   import { isDesktop, desktopSaveProject } from '@/lib/desktop';
 *
 *   if (isDesktop()) {
 *     const result = await desktopSaveProject(allStoreData);
 *   }
 */

// ── Type declarations ─────────────────────────────────────────────────────────

type SaveProjectResult = { filePath?: string; cancelled?: boolean };
type OpenProjectResult = { filePath?: string; data?: unknown; cancelled?: boolean };
type ExportFileResult  = { filePath?: string; cancelled?: boolean };

interface ElectronAPI {
  isDesktop: true;
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  saveProject: (data: unknown, defaultName?: string) => Promise<SaveProjectResult>;
  openProject: () => Promise<OpenProjectResult>;
  exportImage: (dataUrl: string, defaultName?: string) => Promise<ExportFileResult>;
  exportPdf: (buffer: ArrayBuffer, defaultName?: string) => Promise<ExportFileResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// ── Guard ─────────────────────────────────────────────────────────────────────

/** Returns true when running inside the CoachMind desktop app. */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.electronAPI?.isDesktop === true;
}

/** Returns the Electron API or throws if not in desktop mode. */
function api(): ElectronAPI {
  if (!window.electronAPI) {
    throw new Error('Desktop API not available — not running in the CoachMind desktop app.');
  }
  return window.electronAPI;
}

// ── App info ──────────────────────────────────────────────────────────────────

export const desktopGetVersion  = (): Promise<string> => api().getVersion();
export const desktopGetPlatform = (): Promise<string> => api().getPlatform();

// ── File System ───────────────────────────────────────────────────────────────

/**
 * Open a native Save dialog and persist a project to disk.
 * @param data        - Any JSON-serialisable data (pass the full store snapshot)
 * @param defaultName - Suggested filename shown in the dialog
 */
export const desktopSaveProject = (
  data: unknown,
  defaultName?: string
): Promise<SaveProjectResult> => api().saveProject(data, defaultName);

/**
 * Open a native Open dialog and read a project file from disk.
 * Returns the parsed data and the chosen file path.
 */
export const desktopOpenProject = (): Promise<OpenProjectResult> =>
  api().openProject();

/**
 * Export a Konva canvas as a PNG file via a native Save dialog.
 * @param dataUrl     - Result of stage.toDataURL() — a base64 PNG data URL
 * @param defaultName - Suggested filename
 */
export const desktopExportImage = (
  dataUrl: string,
  defaultName?: string
): Promise<ExportFileResult> => api().exportImage(dataUrl, defaultName);

/**
 * Export a PDF buffer to disk via a native Save dialog.
 * @param buffer      - ArrayBuffer of the PDF bytes
 * @param defaultName - Suggested filename
 */
export const desktopExportPdf = (
  buffer: ArrayBuffer,
  defaultName?: string
): Promise<ExportFileResult> => api().exportPdf(buffer, defaultName);
