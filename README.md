# View Images

View and review images similar to `process_images` repo but implemented as an Electron app using **TypeScript** instead of Tkinter and Python. The current `process_images` app wouldn't run on a Macbook Air.

## Development

- Install dependencies:
  - `npm install`
- Run the app (builds TypeScript then starts Electron):
  - `npm start`

The Electron entrypoint is authored in `main.ts`, with `preload.ts` bridging to the renderer logic in `renderer.ts`. Type definitions for the folder/media tree and the exposed preload API live in `types.ts`.

## Source files

Each source file starts with a short comment summarizing its role:

| File | Purpose |
|------|--------|
| **main.ts** | Electron main process entry point. Sets app root, registers IPC handlers, creates the main window, and runs app lifecycle. |
| **main/metadata-types.ts** | Shared type for media metadata (GPS + date) read from EXIF/ExifTool. Used by both image and video metadata readers in metadata.ts. |
| **main/metadata.ts** | Reads GPS (latitude/longitude) and capture date from image and video files. Images: exifr. Videos: exiftool-vendored. Returns MediaMetadata for attachment to file nodes. |
| **main/folderTree.ts** | Builds the folder/media tree when the user selects a directory. Scans recursively, creates FolderNode/FileNode, and attaches EXIF metadata via metadata.ts. |
| **main/windows.ts** | Creates and configures Electron windows: main app window and media viewer (image/video) popups. Uses app root for preload and HTML paths; media viewer args stored for IPC. |
| **main/ipc.ts** | Registers all IPC handlers for the main process: folder open/save, file open/save, open media viewer, and get-media-viewer-args for the viewer window. |
| **renderer.ts** | Renderer process for the main app window: folder tree, media grid, selection, pagination, and sidebar resizer. Talks to main via window.electronAPI (see preload). |
| **preload.ts** | Preload script for the main app window. Exposes a safe API (electronAPI) to the renderer via contextBridge; all main-process calls go through IPC (openFolder, saveFile, openFile, openMediaViewer). |
| **media-viewer-preload.ts** | Preload script for the media viewer window (image/video popup). Exposes mediaViewerAPI.getArgs() so the viewer page can request the file path and type passed when the window was opened. |
| **types.ts** | Shared types for the main process: folder tree (FolderNode, FileNode, MediaNode), optional EXIF fields on files, and the ElectronAPI interface used by preload. |
| **renderer-globals.d.ts** | Global type declarations for the renderer: MediaNode tree types and Window.electronAPI. Ensures renderer.ts sees the same types without importing from main-process modules. |
