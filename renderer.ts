/// <reference path="./renderer-globals.d.ts" />

const btnNew = document.getElementById('btn-new') as HTMLButtonElement;
const treeContainer = document.getElementById('tree-container') as HTMLDivElement;
const gridContainer = document.getElementById('grid-container') as HTMLDivElement;
const pageCounter = document.getElementById('page-counter') as HTMLDivElement;
const pageSizeSelect = document.getElementById('page-size') as HTMLSelectElement | null;

let selectedMedia: MediaNode[] = [];
let currentPage = 1;
let itemsPerPage = 9;

let currentTreeData: FolderNode | null = null;
let selectedNodes: Set<MediaNode> = new Set();
let flatNodeList: Array<{ node: MediaNode; label: HTMLSpanElement }> = [];
let lastSelectedIndex: number | null = null;

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

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

function refreshMediaGallery(): void {
  let allMedia: MediaNode[] = [];

  selectedNodes.forEach(node => {
    allMedia = allMedia.concat(extractMedia(node));
  });

  const unique = new Map<string, MediaNode>();
  allMedia.forEach(item => {
    unique.set(item.path, item);
  });

  selectedMedia = Array.from(unique.values());

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

  selectedMedia = extractMedia(data);
  currentPage = 1;
  updateGridLayout();
  updateGrid();
}

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
