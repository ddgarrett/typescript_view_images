# Feature comparison between projects
_Exported on 3/1/2026 at 12:46:47 PST from Cursor (2.5.26)_

---

**User**

what features found in ../cursor_process_images are not in this project? don't make any changes yet, just compare the two projects

---

**Cursor**


Exploring both projects to compare their structure and features.



Checking a few specifics in both projects to ensure the comparison is accurate.



Here’s a concise comparison of **cursor_process_images** vs **typescript_view_images**, focusing on what exists in **cursor_process_images** but not in this project.

---

## Features in `cursor_process_images` not in this project

### 1. **CSV-backed collection (not JSON-only)**
- **Open** an existing `image_collection.csv` from a folder.
- **Save** the current collection as CSV (not just “save folder structure” as JSON).
- **New** → pick folder, scan, build a **collection** (flat list of rows) stored as CSV.
- **Add Folders** → scan under the same root and **merge** new images into the existing collection.

This project only has: open folder → tree, and save/load **folder tree + metadata as JSON**. No CSV collection, no “add folders” merge.

---

### 2. **Review status and level (img_status / rvw_lvl)**
- **Right-click in gallery** to set status: Reject, Poor Quality, Duplicate, Okay, Good, Best.
- Status and review level stored in the collection (e.g. `img_status`, `rvw_lvl`).
- Default “TBD” for new items.

This project has no status, no right-click menu, and no review workflow.

---

### 3. **“Show” filters (by status/level)**
- **Show** menu/filters: All, TBD, Possible Duplicate, Possible Good or Best, Possible Best.
- Gallery filtered by these status/level values (from `filters.js`: `FilterTbd`, `FilterPossibleDup`, `FilterPossibleGoodPlus`, `FilterPossibleBest`).

This project has no status-based filters (only tree selection and pagination).

---

### 4. **Custom `collection://` protocol**
- Main process registers a **`collection://`** protocol so the renderer loads images by path relative to the collection root.
- Avoids exposing full filesystem paths to the renderer; all image URLs go through this protocol.

This project uses **`file://`** paths directly in the renderer for thumbnails and viewer.

---

### 5. **Richer EXIF/metadata in the collection**
- Collection rows include: `file_id`, `file_location`, `file_name`, `file_size`, `file_media_type`, `img_width`, `img_len`, `img_date_time`, `img_make`, `img_model`, `img_rotate`, `img_tags`, plus status/level and `notes`.
- **exifLoader.js** (and ExifReader) used to populate this on scan; videos use exiftool-vendored.

This project attaches only **GPS (lat/lon) and capture date** to tree nodes (via exifr + exiftool-vendored), and persists that in the JSON tree—no full row schema or CSV columns.

---

### 6. **Table/CSV/collection data model**
- **CsvTable** / **ImageCollection** (and **table.js**, **csv_table.js**) for rows, columns, CSV parse/serialize.
- **metadata.js** defines the collection column set.
- **image_collection.js** with `fromString` / `fromRows`, row type `ImgColRow`, status/level labels.

This project uses a **tree model** (`FolderNode` / `FileNode`) and JSON; no table/row/CSV layer.

---

### 7. **Dedicated “Image” tab**
- A tab that shows a **single image/video view** for the selected item in the main window (plus ability to open that in the separate viewer window).

This project has grid + double-click to open the **separate** viewer window only; no dedicated “Image” tab in the main window.

---

### 8. **Granular FS/path IPC**
- IPC channels for: `fs:readFile`, `fs:writeFile`, `fs:readdir`, `fs:stat`, `fs:mkdir`, `fs:copyFile`, `fs:rename`, and path helpers (`path:join`, `path:dirname`, `path:basename`, `path:sep`).
- Explicit **collection root** handling (`collection:setRoot`, used with `collection://`).

This project does folder open/save and media viewer via higher-level handlers (e.g. open folder → full `FolderNode`, save/open JSON); no low-level fs/path or collection-root IPC.

---

### 9. **Build/packaging (electron-builder)**
- **`npm run pack`** and **`npm run dist`** with **electron-builder** (e.g. `appId`, `productName`, `directories.output`).

This project has no electron-builder; only `build` and `start` (run from source).

---

### 10. **ExifReader vs exifr**
- **cursor_process_images**: **exifreader** for image EXIF.
- **typescript_view_images**: **exifr** for image EXIF.

Different libraries; cursor_process_images also uses its EXIF for the full collection row (width, length, make, model, rotate, tags, etc.), not just GPS/date.

---

### 11. **Event system**
- **EventListener** and shared event names (e.g. FILE_OPEN, TREE) in **eventListener.js** for coordinating UI and collection.

This project does not have an equivalent shared event/listener layer.

---

### 12. **Stubbed/planned features (README)**
- README lists as “not ported”: Reorg Images, Cleanup Dir, Map, Export, Generate Blog, Properties. They’re stubbed or omitted in cursor_process_images and are also not present in this project.

---

## Summary table

| Feature | cursor_process_images | typescript_view_images |
|--------|------------------------|-------------------------|
| Persistence | CSV collection (+ Open/Save/Add Folders) | JSON folder tree only |
| Review workflow | Status + level, right-click in gallery | None |
| Show filters | All, TBD, Possible Dup, Good/Best, etc. | None |
| Image loading | `collection://` protocol | `file://` in renderer |
| Metadata in store | Full row (EXIF + status/level/notes) | GPS + date on tree nodes only |
| Data model | Table/rows/CSV, ImageCollection | Tree (FolderNode/FileNode), JSON |
| Image tab | Yes (single-item view in main window) | No (only grid + popup viewer) |
| FS/path IPC | Fine-grained (readFile, writeFile, path, etc.) | High-level (open/save JSON, open folder) |
| Packaging | electron-builder (pack/dist) | None |
| EXIF library | exifreader | exifr |
| App events | EventListener / named events | Ad hoc |

So: **cursor_process_images** is built around a **CSV collection**, **review status/level**, **status filters**, **collection://**, and **packaging**; **typescript_view_images** is built around a **folder tree**, **JSON save/load**, **simple metadata on nodes**, and **no review workflow or packaging**.

---

**User**

do you have any recommendations for changing this project to accomodate functionality in the other project? again... no changes yet

---

**Cursor**


Here are concrete recommendations for evolving **typescript_view_images** toward the functionality in **cursor_process_images**, without making any code changes yet.

---

## 1. **Data model: collection vs tree**

**Recommendation:** Introduce a **collection** (flat list of media rows) as a first-class concept, while keeping the tree for navigation.

- **Why:** cursor_process_images is built around a CSV collection (one row per file, with status/level). Your app is built around a tree only. Status, filters, and “Add Folders” all assume a flat collection.
- **Options:**
  - **A. Dual model:** Keep `FolderNode` tree for UI, and add an `ImageCollection` (or similar) that is a flat list of media rows. Tree selection filters which rows are shown in the gallery; status/filters apply to the collection. Save/load could support both JSON (tree + metadata) and CSV (collection).
  - **B. Collection primary:** Make the collection the source of truth; derive the tree from `file_location` (folder paths). Closer to cursor_process_images but a bigger refactor.
- **Practical path:** Start with (A): add a collection type and populate it from the current tree (or from a future “New collection” scan). Keep existing “open folder → tree” and “save/load JSON” as one workflow; add “Open/Save CSV” and “Add Folders” as a second workflow that uses the collection.

---

## 2. **Review status and level**

**Recommendation:** Add `img_status` and `rvw_lvl` (or equivalent) to the data model and wire them to the UI.

- **Where:** If you add a collection type, put `status` and `reviewLevel` (and optionally `notes`) on each row. If you stay tree-only for now, add them to `FileNode` (or your media node type).
- **UI:** Right-click context menu on gallery items with: Reject, Poor Quality, Duplicate, Okay, Good, Best (and optionally TBD). Persist in CSV when you have collection export, and in JSON when saving the tree.
- **Default:** New items get a default (e.g. `"tbd"`) so “Show → TBD” has meaning.

---

## 3. **“Show” filters**

**Recommendation:** Add a “Show” (or “Filter”) control that filters the gallery by status/level.

- **Depends on:** (2) being in place.
- **Implementation:** A small filter module (like cursor_process_images’ `filters.js`) with predicates: All, TBD, Possible Duplicate, Possible Good or Best, Possible Best. Gallery receives “current filter” and “current tree selection” and shows the intersection.
- **UI:** Menu or toolbar (e.g. “Show: All | TBD | Possible Duplicate | …”). No need to change project yet; just plan for this once status exists.

---

## 4. **`collection://` protocol**

**Recommendation:** Add a custom protocol when you have a clear “collection root” (e.g. after “New” or “Open CSV” from a folder).

- **Why:** Today you use `file://` in the renderer; that exposes full paths. cursor_process_images uses `collection://` so the renderer only sees paths relative to the collection root, and the main process resolves them.
- **When:** Once you have “Open/Save CSV” or “New collection” that defines a root folder, register `collection://` in the main process and use it for thumbnail and image URLs in the gallery/viewer. Keep `file://` for the “open folder → tree only” flow if you want that to stay simple.
- **Scope:** Main process: register protocol; preload/renderer: build thumbnail URLs as `collection://relative/path` instead of `file://absolute/path`.

---

## 5. **Richer metadata (optional)**

**Recommendation:** Treat “full EXIF row” as optional and phase it in.

- **Today:** You have GPS + date on tree nodes (exifr + exiftool-vendored). That’s enough for tree + gallery + filters if you add status/level.
- **Later:** If you want “Possible Duplicate” based on date/size, or columns like make/model, add more fields to the collection row (and optionally to `FileNode`) and extend your metadata reader (exifr can provide more). You don’t have to match cursor_process_images’ schema exactly; add fields as needed.
- **EXIF library:** Staying on **exifr** is fine; no need to switch to exifreader unless you hit a limitation.

---

## 6. **Image tab (single-item view in main window)**

**Recommendation:** Add an “Image” (or “Preview”) panel/tab in the main window that shows the selected gallery item.

- **Why:** cursor_process_images has both a gallery and a dedicated “Image” tab; you only have grid + popup viewer. A main-window preview improves usability without opening a new window.
- **Implementation:** One panel that shows the selected item (image or video); can reuse the same display logic as the popup viewer (or a shared component). Optional: “Open in viewer window” button that keeps current behavior.

---

## 7. **File menu and workflows**

**Recommendation:** Align menus with the dual workflow (tree vs collection).

- **Tree workflow (current):**  
  - **Open folder** → scan → tree (and optionally fill collection from tree).  
  - **Save / Open** → JSON (tree + metadata).
- **Collection workflow (new):**  
  - **New** → pick folder → scan → build collection (and tree) → optionally save as CSV.  
  - **Open** → pick existing `image_collection.csv` (and its folder) → load collection, set root, build tree.  
  - **Save** → save collection as CSV.  
  - **Add Folders** → scan under same root, merge new files into collection (and tree).

That implies: “Open” and “Save” can have two meanings (JSON vs CSV), or you use “Open folder” / “Open collection” and “Save tree” / “Save collection” to keep them distinct. No code changes yet; just design the menu and which commands map to which data.

---

## 8. **IPC and main process**

**Recommendation:** Add only what you need; avoid copying every cursor_process_images IPC.

- **Needed for collection + Add Folders:**  
  - A way to set “collection root” (for `collection://` and for “Add Folders”).  
  - “Load directory for collection”: scan a folder and return rows (or append to existing collection). You can keep returning a rich object (e.g. tree + rows) instead of exposing raw `fs.readFile` to the renderer.
- **Optional:** Generic `fs`/`path` IPC only if you later add “Reorg Images” or “Cleanup Dir”; not required for the first iteration.
- **Recommendation:** Add handlers like `collection:setRoot`, `collection:loadDirectory` (and maybe `collection:addFolders`) that return structured data, rather than many small fs/path handlers.

---

## 9. **Packaging**

**Recommendation:** Add **electron-builder** when you want distributable builds.

- Add `electron-builder` as a dev dependency and a `build` section in `package.json` (e.g. `appId`, `productName`, `directories.output`).
- Scripts: `pack` (e.g. `electron-builder --dir`) and `dist` (e.g. `electron-builder`). No other project changes required.

---

## 10. **Event system**

**Recommendation:** Introduce a small event bus only if the UI gets hard to wire.

- **Now:** You can add status, filters, and collection by passing state and callbacks through existing components.
- **Later:** If you find yourself threading the same “collection changed” or “filter changed” through many layers, add a minimal event emitter (or an EventListener-style module) with a few named events (e.g. COLLECTION_LOADED, FILTER_CHANGED, TREE_SELECTION_CHANGED). Not necessary for the first set of features.

---

## Suggested order of work (when you do make changes)

1. **Data model** – Add collection type (and optionally status/level on nodes); keep tree.
2. **Status/level** – Add to model and right-click menu in gallery; persist in JSON (and later CSV).
3. **Show filters** – Filter gallery by status/level.
4. **Menus and workflows** – New, Open CSV, Save CSV, Add Folders; “collection root” and when to set it.
5. **`collection://`** – Register protocol and switch gallery/viewer to it when a collection root exists.
6. **Image tab** – Single-item preview in main window.
7. **Richer metadata / EXIF** – Only if you need it for duplicate detection or columns.
8. **Packaging** – electron-builder when you want installers.
9. **Event system** – Only if the above makes the data flow messy.

---

## Summary

- Add a **collection** (flat list of media rows) alongside the tree; support **CSV** for that workflow and keep **JSON** for the tree.
- Add **status/level**, **right-click menu**, and **Show filters** so the app can be used for review like cursor_process_images.
- Introduce **collection root** and **`collection://`** when you add Open/Save/Add Folders for CSV.
- Add an **Image tab** and **electron-builder** when you want better UX and distributables.
- Keep **exifr** and your current tree; extend metadata only as needed. Prefer a few **targeted IPC handlers** over a full fs/path API unless you add features that need it.

No code changes are implied yet; this is a roadmap you can follow when you’re ready to implement.

---

**User**

is there any advantage to keeping a CSV format?

---

**Cursor**


Yes. Keeping (or adding) a CSV format for the **collection** has several advantages; whether they matter depends on how you use the data.

---

## Advantages of CSV for the collection

**1. Human-readable and editable**  
- Open in Excel, Google Sheets, or a text editor.  
- Fix typos, bulk-change status (e.g. “TBD” → “Good”), or add notes without opening the app.  
- JSON can do this too, but CSV is the format people expect for “table in a spreadsheet.”

**2. Fits the data shape**  
- The collection is a flat table: one row per file, columns for path, status, level, date, etc.  
- CSV models that directly. No nesting or repeated keys; what you see in the file matches how you think about it (rows and columns).

**3. Works well with external tools**  
- Spreadsheets: sort, filter, pivot, formulas.  
- Command line: `awk`, `cut`, `sort`, `grep`.  
- Databases: trivial to import.  
- Scripts (Python, etc.): one line to load.  
- JSON is less natural for “table in Excel” and often needs a bit more code to use in ad‑hoc scripts.

**4. Diff-friendly in version control**  
- One row ≈ one line.  
- Git diffs show “this row changed” or “these rows added.”  
- With JSON, a single minified or reformatted file can make diffs noisy; with CSV, changes are usually localized to specific rows.

**5. Interop and legacy**  
- If the original process_images (or any other tool) already reads/writes CSV, keeping CSV keeps compatibility.  
- CSV is a common export/import format for photo workflows and reporting.

**6. Slightly smaller for big flat tables**  
- Column names appear once in the header; each row is just values.  
- For many rows, CSV is often a bit more compact than JSON (where every row repeats the same keys). Usually a minor point.

---

## When CSV is less compelling

- **You never edit the file by hand** and no other tool needs to read it → JSON (or even a binary format) is enough.  
- **You want one file to hold both tree and metadata** → JSON (or similar) is a better fit for nested structure; CSV is for the flat table only.  
- **Escaping and encoding** → CSV has rules for commas, newlines, and quotes; hand-editing can break things. JSON has its own escaping but is more uniform.  
- **Types** → In CSV everything is a string; your code must parse numbers/dates. JSON has numbers, booleans, null. For a TypeScript app this is manageable either way.

---

## Summary

**Yes, there is advantage to keeping CSV** if you care about:

- Editing the collection in a spreadsheet or text editor  
- Using other tools (scripts, DBs, reports) on the same file  
- Clear, row-oriented diffs in version control  
- Compatibility with existing CSV-based workflows  

If the collection is only ever read/written by your app and you don’t need spreadsheets or external tooling, **JSON alone is sufficient** and keeps the implementation simpler. A practical approach is to support **both**: JSON for the tree (and maybe a “session” snapshot), CSV for the flat collection when you want portability and human editing.

