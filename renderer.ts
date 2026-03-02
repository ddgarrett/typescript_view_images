/// <reference path="./renderer-globals.d.ts" />

/**
 * Renderer process for the main app window: folder tree, media grid, selection, pagination,
 * and sidebar resizer. Talks to main via window.electronAPI (see preload).
 */

// ─── DOM references ───────────────────────────────────────────────────────

const btnNew = document.getElementById('btn-new') as HTMLButtonElement;
const treeContainer = document.getElementById('tree-container') as HTMLDivElement;
const gridContainer = document.getElementById('grid-container') as HTMLDivElement;
const pageCounter = document.getElementById('page-counter') as HTMLDivElement;
const pageSizeSelect = document.getElementById('page-size') as HTMLSelectElement | null;
const showFilterSelect = document.getElementById('show-filter') as HTMLSelectElement | null;

// ─── State ─────────────────────────────────────────────────────────────────

let selectedMedia: MediaNode[] = [];
let currentPage = 1;
let itemsPerPage = 9;

/** Current Show filter: which media to display in the gallery. */
type ShowFilter = 'all' | 'tbd' | 'possible_dup' | 'possible_good_plus' | 'possible_best';
let showFilter: ShowFilter = 'all';

let currentTreeData: FolderNode | null = null;
let selectedNodes: Set<MediaNode> = new Set();
let flatNodeList: Array<{ node: MediaNode; label: HTMLSpanElement }> = [];
let lastSelectedIndex: number | null = null;

// ─── Utilities ─────────────────────────────────────────────────────────────

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ─── Tree & media helpers ───────────────────────────────────────────────────

function extractMedia(node: MediaNode): MediaNode[] {
  const media: MediaNode[] = [];

  if (node.type === 'folder') {
    node.children.forEach(child => {
      media.push(...extractMedia(child));
    });
  } else {
    media.push(node);
  }

  return media;
}

function buildTree(node: FolderNode, parentElement: HTMLElement): void {
  const ul = document.createElement('ul');
  parentElement.appendChild(ul);

  node.children.forEach(child => {
    const li = document.createElement('li');
    ul.appendChild(li);

    const label = document.createElement('span');
    label.textContent = child.name;

    const index = flatNodeList.length;
    flatNodeList.push({ node: child, label });
    label.dataset.index = String(index);

    if (child.type === 'folder') {
      label.className = 'folder-icon';
      li.appendChild(label);

      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'hidden';
      li.appendChild(childrenContainer);

      buildTree(child, childrenContainer);

      label.addEventListener('click', e => handleSelection(e, child, label));
    } else {
      label.className = 'file-icon';
      li.appendChild(label);

      label.addEventListener('click', e => handleSelection(e, child, label));
    }
  });
}

// ─── Selection & gallery ───────────────────────────────────────────────────

/** Apply Show filter to a list of media nodes (file nodes only). */
function applyShowFilter(media: MediaNode[]): MediaNode[] {
  const files = media.filter((n): n is FileNode => n.type !== 'folder');
  if (showFilter === 'all') return files;
  return files.filter(node => {
    const status = node.status ?? 'tbd';
    const level = node.reviewLevel ?? 0;
    switch (showFilter) {
      case 'tbd':
        return status === 'tbd';
      case 'possible_dup':
        return (level < 3 && status === 'tbd') || status === 'dup';
      case 'possible_good_plus':
        return level > 3 || status === 'tbd';
      case 'possible_best':
        return level > 4 || status === 'tbd';
      default:
        return true;
    }
  });
}

function refreshMediaGallery(): void {
  let allMedia: MediaNode[] = [];

  if (selectedNodes.size > 0) {
    selectedNodes.forEach(node => {
      allMedia = allMedia.concat(extractMedia(node));
    });
  } else if (currentTreeData) {
    allMedia = extractMedia(currentTreeData);
  }

  const unique = new Map<string, MediaNode>();
  allMedia.forEach(item => {
    unique.set(item.path, item);
  });

  const unfiltered = Array.from(unique.values());
  selectedMedia = applyShowFilter(unfiltered);

  currentPage = 1;
  updateGrid();
}

const handleSelection = (e: MouseEvent, node: MediaNode, label: HTMLSpanElement): void => {
  e.stopPropagation();

  const index = parseInt(label.dataset.index ?? '-1', 10);
  if (Number.isNaN(index) || index < 0) {
    return;
  }

  const hasToggleModifier = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;

  if (isShift && lastSelectedIndex !== null) {
    if (!hasToggleModifier) {
      selectedNodes.clear();
      document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    }

    const start = Math.min(lastSelectedIndex, index);
    const end = Math.max(lastSelectedIndex, index);

    for (let i = start; i <= end; i += 1) {
      const item = flatNodeList[i];
      if (!item) continue;

      if (hasToggleModifier && selectedNodes.has(item.node)) {
        selectedNodes.delete(item.node);
        item.label.classList.remove('selected');
      } else if (!selectedNodes.has(item.node)) {
        selectedNodes.add(item.node);
        item.label.classList.add('selected');
      }
    }

    refreshMediaGallery();
    return;
  }

  if (!hasToggleModifier) {
    selectedNodes.clear();
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    selectedNodes.add(node);
    label.classList.add('selected');
  } else {
    if (selectedNodes.has(node)) {
      selectedNodes.delete(node);
      label.classList.remove('selected');
    } else {
      selectedNodes.add(node);
      label.classList.add('selected');
    }
  }

  if (node.type === 'folder' && !hasToggleModifier && !isShift) {
    const childrenContainer = label.nextElementSibling as HTMLElement | null;
    if (childrenContainer) {
      const isHidden = childrenContainer.classList.toggle('hidden');
      label.classList.replace(
        isHidden ? 'folder-open' : 'folder-icon',
        isHidden ? 'folder-icon' : 'folder-open'
      );
    }
  }

  // Plain or Ctrl/Cmd click: set the anchor for subsequent Shift-clicks
  lastSelectedIndex = index;
  refreshMediaGallery();
};

// ─── Grid & pagination ──────────────────────────────────────────────────────

function updateGridLayout(): void {
  const gridSize = Math.sqrt(itemsPerPage) || 1;
  gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  gridContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
}

function updateGrid(): void {
  gridContainer.innerHTML = '';
  const totalPages = Math.ceil(selectedMedia.length / itemsPerPage) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  pageCounter.textContent = `Page ${currentPage} of ${totalPages} pages`;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, selectedMedia.length);
  const itemsToShow = selectedMedia.slice(startIndex, endIndex);

  itemsToShow.forEach(media => {
    if (media.type === 'folder') {
      return;
    }

    const fileNode = media as FileNode;
    const div = document.createElement('div');
    div.className = 'media-item';

    div.addEventListener('dblclick', () => {
      void window.electronAPI.openMediaViewer(fileNode.path, fileNode.type);
    });

    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showStatusContextMenu(e, fileNode);
    });

    if (fileNode.type === 'image') {
      const img = document.createElement('img');
      img.src = `file://${fileNode.path}`;
      div.appendChild(img);
    } else if (fileNode.type === 'video') {
      const video = document.createElement('video');
      video.src = `file://${fileNode.path}#t=0.1`;
      video.preload = 'metadata';
      video.muted = true;
      div.appendChild(video);

      const playIcon = document.createElement('div');
      playIcon.className = 'play-icon';
      playIcon.innerHTML = '▶';
      div.appendChild(playIcon);
    }

    gridContainer.appendChild(div);
  });
}

const STATUS_MENU_ITEMS: { label: string; status: FileNode['status']; reviewLevel: 0 | 1 | 2 | 3 | 4 | 5 }[] = [
  { label: 'Reject', status: 'reject', reviewLevel: 0 },
  { label: 'Poor Quality', status: 'bad', reviewLevel: 1 },
  { label: 'Duplicate', status: 'dup', reviewLevel: 2 },
  { label: 'Just Okay', status: 'ok', reviewLevel: 3 },
  { label: 'Good', status: 'good', reviewLevel: 4 },
  { label: 'Best', status: 'best', reviewLevel: 5 },
  { label: 'TBD', status: 'tbd', reviewLevel: 0 }
];

function showStatusContextMenu(e: MouseEvent, fileNode: FileNode): void {
  const popup = document.createElement('div');
  popup.className = 'context-menu';
  popup.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:#2d2d2d;border:1px solid #444;border-radius:4px;padding:4px;z-index:1000;min-width:160px;`;
  STATUS_MENU_ITEMS.forEach(({ label, status, reviewLevel }) => {
    const item = document.createElement('div');
    item.textContent = label;
    item.style.cssText = 'padding:6px 12px;cursor:pointer;';
    item.addEventListener('click', () => {
      fileNode.status = status;
      fileNode.reviewLevel = reviewLevel;
      document.body.removeChild(popup);
      refreshMediaGallery();
    });
    item.addEventListener('mouseenter', () => { item.style.background = '#404040'; });
    item.addEventListener('mouseleave', () => { item.style.background = ''; });
    popup.appendChild(item);
  });
  document.body.appendChild(popup);
  const close = () => {
    if (popup.parentNode) document.body.removeChild(popup);
    document.removeEventListener('click', close);
  };
  setTimeout(() => document.addEventListener('click', close), 0);
}

// ─── Load tree data ─────────────────────────────────────────────────────────

function loadTreeData(data: FolderNode): void {
  currentTreeData = data;
  treeContainer.innerHTML = '';
  flatNodeList = [];
  lastSelectedIndex = null;
  selectedNodes.clear();

  const rootItem = document.createElement('div');
  rootItem.textContent = data.name;
  rootItem.className = 'folder-open';
  rootItem.style.fontWeight = 'bold';
  rootItem.style.cursor = 'pointer';
  treeContainer.appendChild(rootItem);

  buildTree(data, treeContainer);

  selectedMedia = applyShowFilter(extractMedia(data));
  currentPage = 1;
  updateGridLayout();
  updateGrid();
}

// ─── Event binding ─────────────────────────────────────────────────────────

btnNew.addEventListener('click', async () => {
  const data = await window.electronAPI.openFolder();
  if (data) loadTreeData(data);
});

document.getElementById('btn-save')?.addEventListener('click', async () => {
  if (!currentTreeData) {
    alert('No folder loaded to save!');
    return;
  }
  const jsonString = JSON.stringify(currentTreeData, null, 2);
  const success = await window.electronAPI.saveFile(jsonString);
  if (success) console.log('File saved successfully.');
});

document.getElementById('btn-open')?.addEventListener('click', async () => {
  const data = await window.electronAPI.openFile();
  if (data) loadTreeData(data);
});

document.getElementById('btn-import-csv')?.addEventListener('click', async () => {
  const data = await window.electronAPI.openCsv();
  if (data) loadTreeData(data);
});

showFilterSelect?.addEventListener('change', () => {
  const value = showFilterSelect.value as ShowFilter;
  if (['all', 'tbd', 'possible_dup', 'possible_good_plus', 'possible_best'].includes(value)) {
    showFilter = value;
    refreshMediaGallery();
  }
});

// Pagination controls
document.getElementById('btn-first')?.addEventListener('click', () => {
  currentPage = 1;
  updateGrid();
});

document.getElementById('btn-prev')?.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    updateGrid();
  }
});

document.getElementById('btn-next')?.addEventListener('click', () => {
  const totalPages = Math.ceil(selectedMedia.length / itemsPerPage) || 1;
  if (currentPage < totalPages) {
    currentPage += 1;
    updateGrid();
  }
});

document.getElementById('btn-last')?.addEventListener('click', () => {
  currentPage = Math.ceil(selectedMedia.length / itemsPerPage) || 1;
  updateGrid();
});

// Page size selector
pageSizeSelect?.addEventListener('change', () => {
  const value = parseInt(pageSizeSelect.value, 10);
  if (!Number.isNaN(value) && value > 0) {
    itemsPerPage = value;
    currentPage = 1;
    updateGridLayout();
    updateGrid();
  }
});

// ─── Sidebar resizer ────────────────────────────────────────────────────────

const resizer = document.getElementById('drag-bar') as HTMLDivElement;
const sidebar = document.getElementById('sidebar') as HTMLDivElement;

let isResizing = false;

resizer.addEventListener('mousedown', () => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', e => {
  if (!isResizing) return;

  const newWidth = e.clientX;

  if (newWidth > 150 && newWidth < window.innerWidth * 0.8) {
    sidebar.style.width = `${newWidth}px`;
  }
});

document.addEventListener('mouseup', () => {
  isResizing = false;
  document.body.style.cursor = 'default';
  document.body.style.userSelect = 'auto';
});

export {};
