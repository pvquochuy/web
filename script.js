
'use strict';

/*1. COLOR PROCESSOR*/
const ColorProcessor = (() => {
  const MATRICES = {
    protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
    deuteranopia: [0.625, 0.375, 0, 0.700, 0.300, 0, 0, 0.300, 0.700],
    tritanopia: [0.950, 0.050, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
  };
  const EXPLANATIONS = {
    none: '',
    protanopia: '🔴 Protanopia: Thiếu tế bào L-cone (màu đỏ). Bộ lọc dịch chuyển kênh đỏ sang vàng/xanh lá.',
    deuteranopia: '🟢 Deuteranopia: Thiếu tế bào M-cone (xanh lá). Bộ lọc tăng cường đỏ và xanh lam.',
    tritanopia: '🔵 Tritanopia: Thiếu tế bào S-cone (xanh lam). Bộ lọc điều chỉnh kênh xanh lam.',
  };

  function process(imageData, mode, intensity, brightness, contrast, mangaMode) {
    const src = imageData.data;
    const out = new Uint8ClampedArray(src);
    const len = src.length;
    const m = MATRICES[mode];
    const t = (intensity == null ? 100 : intensity) / 100;

    const con = mangaMode ? Math.min((contrast || 0) + 60, 100) : (contrast || 0);
    const bri = mangaMode ? Math.min((brightness || 0) + 10, 100) : (brightness || 0);
    const cf = con !== 0 ? (259 * (con + 255)) / (255 * (259 - con)) : 1;

    for (let i = 0; i < len; i += 4) {
      let r = src[i], g = src[i + 1], b = src[i + 2];
      if (m && t > 0) {
        const fr = m[0] * r + m[1] * g + m[2] * b, fg = m[3] * r + m[4] * g + m[5] * b, fb = m[6] * r + m[7] * g + m[8] * b;
        r = r + t * (fr - r); g = g + t * (fg - g); b = b + t * (fb - b);
      }
      if (bri) { r += bri; g += bri; b += bri; }
      if (cf !== 1) { r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; b = cf * (b - 128) + 128; }
      out[i] = Math.max(0, Math.min(255, r));
      out[i + 1] = Math.max(0, Math.min(255, g));
      out[i + 2] = Math.max(0, Math.min(255, b));
      out[i + 3] = src[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  function processCanvas(src, mode, intensity, brightness, contrast, mangaMode) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    if (mode === 'none' && !brightness && !contrast && !mangaMode) return c;
    const id = ctx.getImageData(0, 0, c.width, c.height);
    ctx.putImageData(process(id, mode, intensity, brightness, contrast, mangaMode), 0, 0);
    return c;
  }

  return { process, processCanvas, getExplanation: m => EXPLANATIONS[m] || '' };
})();

/* ============================================================
   2. LIBRARY DB (IndexedDB)
   ============================================================ */
const LibraryDB = (() => {
  const DB_NAME = 'VisionVoiceLib', DB_VER = 1, STORE = 'files';
  let _db = null;

  function getDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror = e => rej(e.target.error);
    });
  }

  async function save(entry) {
    const db = await getDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(entry).onsuccess = e => res(e.target.result);
      tx.onerror = e => rej(e.target.error);
    });
  }

  async function getAll() {
    const db = await getDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => res(req.result.reverse());
      req.onerror = e => rej(e.target.error);
    });
  }

  async function get(id) {
    const db = await getDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      req.onsuccess = () => res(req.result);
      req.onerror = e => rej(e.target.error);
    });
  }

  async function updateProgress(id, lastPage) {
    const db = await getDB();
    const item = await get(id);
    if (!item) return;
    item.lastPage = lastPage;
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(item);
      req.onsuccess = () => res();
      req.onerror = e => rej(e.target.error);
    });
  }

  async function remove(id) {
    const db = await getDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
      req.onsuccess = () => res();
      req.onerror = e => rej(e.target.error);
    });
  }

  async function clearAll() {
    const db = await getDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
      req.onsuccess = () => res();
      req.onerror = e => rej(e.target.error);
    });
  }

  return { save, getAll, get, updateProgress, remove, clearAll };
})();

/* ============================================================
   3. LIBRARY MODULE
   ============================================================ */
const LibraryModule = (() => {
  async function render() {
    const grid = document.getElementById('library-grid');
    if (!grid) return;
    let files = [];
    try { files = await LibraryDB.getAll(); } catch (e) { console.warn(e); }

    if (!files.length) {
      grid.innerHTML = `<div class="empty-state"><span class="ei">📂</span><p>Chưa có file nào được lưu.<br/>Upload file từ mục <strong>Đọc File</strong> để tự động lưu vào đây.</p></div>`;
      return;
    }

    grid.innerHTML = files.map(f => `
      <div class="lib-card" role="listitem">
        <div class="lib-thumb">
          ${f.thumbnail ? `<img src="${f.thumbnail}" alt="${f.name}"/>` : '<span>📄</span>'}
        </div>
        <div class="lib-info">
          <div class="lib-name" title="${f.name}">${f.name}</div>
          <div class="lib-meta">Trang ${f.lastPage || 1}/${f.totalPages || 1} · ${new Date(f.timestamp).toLocaleDateString('vi-VN')}</div>
          <div class="lib-progress-bar">
            <div class="lib-progress-fill" style="width:${Math.round(((f.lastPage || 1) / (f.totalPages || 1)) * 100)}%"></div>
          </div>
        </div>
        <div class="lib-actions">
          <button class="btn-primary btn-sm" onclick="LibraryModule.open(${f.id})">▶ Tiếp tục</button>
          <button class="btn-icon" onclick="LibraryModule.remove(${f.id})" aria-label="Xóa" title="Xóa">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  async function open(id) {
    const f = await LibraryDB.get(id);
    if (!f) { showToast('❌ Không tìm thấy file'); return; }
    navigateTo('filereader');
    setTimeout(() => {
      const blob = new Blob([f.data], { type: f.type });
      const file = new File([blob], f.name, { type: f.type });
      FileReaderModule.loadFile(file, f.lastPage || 1, id);
    }, 350);
  }

  async function remove(id) {
    if (!confirm('Xóa file này khỏi thư viện?')) return;
    await LibraryDB.remove(id);
    render();
    showToast('🗑️ Đã xóa');
  }

  async function clearAll() {
    if (!confirm('Xóa toàn bộ thư viện?')) return;
    await LibraryDB.clearAll();
    render();
    showToast('🗑️ Đã xóa tất cả');
  }

  return { render, open, remove, clearAll };
})();

/* ============================================================
   4. CAMERA MODULE
   ============================================================ */
const CameraModule = (() => {
  let stream = null, raf = null, running = false, captured = null, facing = 'environment';
  let mode = 'none', bright = 0, cont = 0, intens = 100;

  function renderFrame() {
    const vid = document.getElementById('cam-video');
    const cvs = document.getElementById('cam-canvas');
    if (!vid || !cvs || vid.readyState < 2) { if (running) raf = requestAnimationFrame(renderFrame); return; }
    if (cvs.width !== vid.videoWidth) { cvs.width = vid.videoWidth || 640; cvs.height = vid.videoHeight || 480; }
    const ctx = cvs.getContext('2d');
    ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
    if (mode !== 'none' || bright || cont) {
      const id = ctx.getImageData(0, 0, cvs.width, cvs.height);
      ctx.putImageData(ColorProcessor.process(id, mode, intens, bright, cont, false), 0, 0);
    }
    if (running) raf = requestAnimationFrame(renderFrame);
  }

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } });
      const vid = document.getElementById('cam-video');
      const cvs = document.getElementById('cam-canvas');
      vid.srcObject = stream; await vid.play();
      document.getElementById('camera-placeholder').hidden = true;
      cvs.hidden = false;
      running = true; raf = requestAnimationFrame(renderFrame);
      document.getElementById('btn-start-camera').textContent = '⏹ Tắt Camera';
      document.getElementById('btn-capture').disabled = false;
      document.getElementById('btn-flip-camera').disabled = false;
      showToast('📷 Camera đã bật');
    } catch (e) { showToast('❌ Không thể mở camera: ' + e.message); }
  }

  function stop() {
    running = false; cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach(t => t.stop()); stream = null;
    const vid = document.getElementById('cam-video');
    const cvs = document.getElementById('cam-canvas');
    if (vid) { vid.srcObject = null; vid.hidden = true; }
    if (cvs) cvs.hidden = true;
    document.getElementById('camera-placeholder').hidden = false;
    document.getElementById('btn-start-camera').textContent = '📷 Bật Camera';
    document.getElementById('btn-capture').disabled = true;
    showToast('⏹ Camera đã tắt');
  }

  function capture() {
    const cvs = document.getElementById('cam-canvas');
    if (!cvs) return;
    const cap = document.getElementById('cam-capture-canvas');
    cap.width = cvs.width; cap.height = cvs.height;
    cap.getContext('2d').drawImage(cvs, 0, 0);
    captured = cap;
    const pv = document.getElementById('preview-canvas');
    pv.width = cap.width; pv.height = cap.height;
    pv.getContext('2d').drawImage(cap, 0, 0);
    document.getElementById('capture-preview').hidden = false;
    document.getElementById('btn-download-capture').disabled = false;
    showToast('📸 Đã chụp ảnh');
  }

  function download() {
    if (!captured) return;
    const a = document.createElement('a');
    a.download = 'camera-' + Date.now() + '.png';
    a.href = captured.toDataURL('image/png'); a.click();
    showToast('⬇️ Đang tải xuống...');
  }

  function init() {
    document.getElementById('btn-start-camera').addEventListener('click', () => running ? stop() : start());
    document.getElementById('btn-flip-camera').addEventListener('click', async () => {
      facing = facing === 'environment' ? 'user' : 'environment';
      document.getElementById('btn-flip-camera').textContent = facing === 'environment' ? '🔄 Cam sau' : '🔄 Cam trước';
      if (running) { stop(); await start(); }
    });
    document.getElementById('btn-capture').addEventListener('click', capture);
    document.getElementById('btn-download-capture').addEventListener('click', download);
    document.querySelectorAll('input[name="cam-mode"]').forEach(r => r.addEventListener('change', e => { mode = e.target.value; updatePills('cam-mode'); }));
    setupSlider('cam-brightness', 'cam-brightness-val', v => bright = v);
    setupSlider('cam-contrast', 'cam-contrast-val', v => cont = v);
    setupSlider('cam-intensity', 'cam-intensity-val', v => intens = v, true);
  }

  return { init };
})();

/* ============================================================
   5. FILE READER MODULE
   ============================================================ */
const FileReaderModule = (() => {
  let srcCanvas = null, pdfDoc = null;
  let curPage = 1, totalPages = 1, zoom = 100;
  let mode = 'none', intens = 100, bright = 0, cont = 0, mangaMode = false;
  let showOriginal = false;
  let dbId = null; // ID trong IndexedDB nếu đã lưu

  function applyAndRender() {
    if (!srcCanvas) return;
    const pc = document.getElementById('canvas-processed');
    const oc = document.getElementById('canvas-original');
    pc.width = srcCanvas.width; pc.height = srcCanvas.height;

    if (showOriginal) {
      // Hiện ảnh gốc
      pc.getContext('2d').drawImage(srcCanvas, 0, 0);
      oc.hidden = true;
    } else {
      // Hiện ảnh đã xử lý
      const processed = ColorProcessor.processCanvas(srcCanvas, mode, intens, bright, cont, mangaMode);
      pc.getContext('2d').drawImage(processed, 0, 0);
      // Original overlay ẩn
      if (oc) oc.hidden = true;
    }

    // Zoom
    pc.style.transform = `scale(${zoom / 100})`;
    pc.style.transformOrigin = 'top left';
    document.getElementById('zoom-label').textContent = zoom + '%';

    // Info
    const info = document.getElementById('cb-info-box');
    if (info) {
      const exp = ColorProcessor.getExplanation(mode);
      const manga = mangaMode ? ' | 📚 Manga Mode: Tăng tương phản+60, sáng+10' : '';
      info.textContent = (exp || '') + manga;
    }
  }

  // Tạo thumbnail 160x220 từ srcCanvas
  function makeThumbnail() {
    const c = document.createElement('canvas');
    c.width = 160; c.height = 220;
    const ctx = c.getContext('2d');
    const ratio = srcCanvas.height / srcCanvas.width;
    const h = Math.min(220, 160 * ratio);
    ctx.drawImage(srcCanvas, 0, 0, 160, h);
    return c.toDataURL('image/jpeg', 0.7);
  }

  // Lưu file vào IndexedDB
  async function saveToLibrary(file, thumbnail, totalPg) {
    const data = await file.arrayBuffer();
    try {
      const id = await LibraryDB.save({
        name: file.name, type: file.type, data,
        thumbnail, totalPages: totalPg, lastPage: curPage,
        timestamp: Date.now(),
      });
      dbId = id;
      showToast('💾 Đã lưu vào thư viện');
    } catch (e) { console.warn('Save to library failed:', e); }
  }

  function loadImageFile(file, startPage, existingId) {
    pdfDoc = null;
    document.getElementById('pdf-nav').hidden = true;
    dbId = existingId || null;

    const reader = new window.FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.naturalWidth; srcCanvas.height = img.naturalHeight;
        srcCanvas.getContext('2d').drawImage(img, 0, 0);
        totalPages = 1; curPage = 1;
        showPanel();
        applyAndRender();
        showToast('🖼️ Đã tải ảnh');
        // Lưu thư viện nếu file mới
        if (!dbId) saveToLibrary(file, makeThumbnail(), 1);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function loadPDFFile(file, startPage, existingId) {
    if (!window.pdfjsLib) { showToast('❌ PDF.js chưa tải'); return; }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    dbId = existingId || null;
    try {
      const ab = await file.arrayBuffer();
      pdfDoc = await window.pdfjsLib.getDocument({ data: ab }).promise;
      totalPages = pdfDoc.numPages;
      curPage = startPage || 1;
      document.getElementById('pdf-nav').hidden = false;
      updatePageInfo();
      await renderPDFPage(curPage);
      showPanel();
      showToast(`📄 PDF đã tải: ${totalPages} trang`);
      // Lưu thư viện nếu file mới
      if (!dbId) {
        // Tạo thumbnail sau khi render xong
        setTimeout(() => saveToLibrary(file, makeThumbnail(), totalPages), 400);
      }
    } catch (e) { showToast('❌ Lỗi đọc PDF: ' + e.message); }
  }

  async function renderPDFPage(n) {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(n);
    const vp = page.getViewport({ scale: 1.8 });
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = vp.width; srcCanvas.height = vp.height;
    await page.render({ canvasContext: srcCanvas.getContext('2d'), viewport: vp }).promise;
    applyAndRender();
    // Cập nhật tiến độ
    if (dbId) LibraryDB.updateProgress(dbId, n).catch(() => { });
  }

  function updatePageInfo() {
    document.getElementById('page-info').textContent = `Trang ${curPage} / ${totalPages}`;
    document.getElementById('btn-prev-page').disabled = curPage <= 1;
    document.getElementById('btn-next-page').disabled = curPage >= totalPages;
  }

  function showPanel() {
    document.getElementById('file-upload-area').hidden = true;
    document.getElementById('file-reader-panel').hidden = false;
  }

  function reset() {
    srcCanvas = null; pdfDoc = null; curPage = 1; zoom = 100; dbId = null;
    document.getElementById('file-upload-area').hidden = false;
    document.getElementById('file-reader-panel').hidden = true;
    document.getElementById('file-input-reader').value = '';
    document.getElementById('pdf-nav').hidden = true;
    const info = document.getElementById('cb-info-box');
    if (info) info.textContent = '';
    showToast('🔄 Đã xóa file');
  }

  function download() {
    const cvs = document.getElementById('canvas-processed');
    if (!cvs || !cvs.width) { showToast('❌ Chưa có ảnh'); return; }
    const a = document.createElement('a');
    a.download = 'vision-voice-' + (mode || 'original') + '-' + Date.now() + '.png';
    a.href = cvs.toDataURL('image/png'); a.click();
    showToast('⬇️ Đang tải xuống...');
  }

  // Cho LibraryModule gọi vào
  function loadFile(file, startPage, existingId) {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      loadPDFFile(file, startPage, existingId);
    } else {
      loadImageFile(file, startPage, existingId);
    }
  }

  function init() {
    const dz = document.getElementById('file-dropzone');
    const fi = document.getElementById('file-input-reader');

    dz.addEventListener('click', () => fi.click());
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      const f = e.dataTransfer.files[0]; if (f) loadFile(f);
    });
    fi.addEventListener('change', () => { if (fi.files[0]) loadFile(fi.files[0]); });

    // Mode
    document.querySelectorAll('input[name="file-mode"]').forEach(r => r.addEventListener('change', e => {
      mode = e.target.value; updatePills('file-mode'); applyAndRender();
    }));

    // Manga mode
    document.getElementById('toggle-manga').addEventListener('change', e => {
      mangaMode = e.target.checked; applyAndRender();
      showToast(mangaMode ? '📚 Manga Mode bật' : '📚 Manga Mode tắt');
    });

    // Toggle compare (xem gốc / xem đã lọc)
    document.getElementById('toggle-compare').addEventListener('change', e => {
      showOriginal = e.target.checked;
      applyAndRender();
      showToast(showOriginal ? '👁 Đang xem ảnh gốc' : '🎨 Đang xem ảnh đã lọc');
    });

    // Sliders
    setupSlider('file-brightness', 'file-brightness-val', v => { bright = v; applyAndRender(); });
    setupSlider('file-contrast', 'file-contrast-val', v => { cont = v; applyAndRender(); });
    setupSlider('file-intensity', 'file-intensity-val', v => { intens = v; applyAndRender(); }, true);

    // Zoom
    document.getElementById('btn-zoom-in').addEventListener('click', () => { zoom = Math.min(zoom + 20, 400); applyAndRender(); });
    document.getElementById('btn-zoom-out').addEventListener('click', () => { zoom = Math.max(zoom - 20, 30); applyAndRender(); });
    document.getElementById('btn-zoom-fit').addEventListener('click', () => { zoom = 100; applyAndRender(); });

    // PDF nav
    document.getElementById('btn-prev-page').addEventListener('click', async () => {
      if (curPage > 1) { curPage--; updatePageInfo(); await renderPDFPage(curPage); }
    });
    document.getElementById('btn-next-page').addEventListener('click', async () => {
      if (curPage < totalPages) { curPage++; updatePageInfo(); await renderPDFPage(curPage); }
    });

    // Keyboard PDF nav (← →)
    document.addEventListener('keydown', e => {
      if (!pdfDoc || document.activeElement.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' && curPage > 1) { curPage--; updatePageInfo(); renderPDFPage(curPage); }
      if (e.key === 'ArrowRight' && curPage < totalPages) { curPage++; updatePageInfo(); renderPDFPage(curPage); }
    });

    document.getElementById('btn-download-file').addEventListener('click', download);
    document.getElementById('btn-reset-file').addEventListener('click', reset);
  }

  return { init, loadFile };
})();

/* ============================================================
   6. WEB LENS MODULE
   ============================================================ */
const WebLensModule = (() => {
  let pipStream = null, pipRaf = null, pipMode = 'none';
  let lensZoom = 100;

  function loadURL(url) {
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    const iframe = document.getElementById('web-iframe');
    const ph = document.getElementById('iframe-placeholder');
    iframe.src = url;
    iframe.hidden = false;
    ph.hidden = true;
    // CSS filter áp dụng lên toàn iframe
    applyIframeFilter(pipMode);
    showToast('🔍 Đang tải: ' + url);
    iframe.onerror = () => showToast('❌ Trang này chặn nhúng iframe');
  }

  function applyIframeFilter(mode) {
    const iframe = document.getElementById('web-iframe');
    const map = { none: '', protanopia: 'url(#f-protanopia)', deuteranopia: 'url(#f-deuteranopia)', tritanopia: 'url(#f-tritanopia)' };
    iframe.style.filter = map[mode] || '';
    pipMode = mode;
  }

  // Camera PiP
  async function togglePIP() {
    const pip = document.getElementById('cam-pip');
    if (pipStream) {
      pipStream.getTracks().forEach(t => t.stop()); pipStream = null;
      cancelAnimationFrame(pipRaf);
      pip.hidden = true;
      showToast('📷 Camera PiP đã tắt');
      return;
    }
    try {
      pipStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 } } });
      const vid = document.getElementById('pip-video');
      vid.srcObject = pipStream; await vid.play();
      pip.hidden = false;
      renderPIP();
      showToast('📷 Camera PiP đã bật');
    } catch (e) { showToast('❌ Không thể mở camera: ' + e.message); }
  }

  function renderPIP() {
    const vid = document.getElementById('pip-video');
    const cvs = document.getElementById('pip-canvas');
    if (!cvs || !vid || vid.readyState < 2) { pipRaf = requestAnimationFrame(renderPIP); return; }

    // Ẩn video thô, chỉ hiện canvas đã xử lý
    vid.style.display = 'none';
    cvs.style.display = 'block';
    cvs.width = 280; cvs.height = 200;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(vid, 0, 0, 280, 200);

    if (pipMode !== 'none') {
      const id = ctx.getImageData(0, 0, 280, 200);
      ctx.putImageData(ColorProcessor.process(id, pipMode, 100, 0, 0, false), 0, 0);
    }
    pipRaf = requestAnimationFrame(renderPIP);
  }

  // PiP draggable
  function initDraggable() {
    const pip = document.getElementById('cam-pip');
    const header = document.getElementById('pip-header');
    if (!pip || !header) return;
    let dragging = false, ox = 0, oy = 0;

    header.addEventListener('mousedown', e => {
      dragging = true; ox = e.clientX - pip.offsetLeft; oy = e.clientY - pip.offsetTop;
      pip.style.right = 'auto';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      pip.style.left = (e.clientX - ox) + 'px'; pip.style.top = (e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', () => dragging = false);

    // Touch
    header.addEventListener('touchstart', e => {
      dragging = true;
      ox = e.touches[0].clientX - pip.offsetLeft; oy = e.touches[0].clientY - pip.offsetTop;
      pip.style.right = 'auto';
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!dragging) return;
      pip.style.left = (e.touches[0].clientX - ox) + 'px'; pip.style.top = (e.touches[0].clientY - oy) + 'px';
    }, { passive: true });
    document.addEventListener('touchend', () => dragging = false);
  }

  function init() {
    // Load URL
    document.getElementById('btn-load-url').addEventListener('click', () => {
      loadURL(document.getElementById('lens-url').value.trim());
    });
    document.getElementById('lens-url').addEventListener('keydown', e => {
      if (e.key === 'Enter') loadURL(e.target.value.trim());
    });

    // Filter pills
    document.querySelectorAll('input[name="lens-mode"]').forEach(r => {
      r.addEventListener('change', e => { applyIframeFilter(e.target.value); updatePills('lens-mode'); });
    });

    // Camera PiP
    document.getElementById('btn-cam-pip').addEventListener('click', togglePIP);
    document.getElementById('btn-close-pip').addEventListener('click', () => {
      if (pipStream) { pipStream.getTracks().forEach(t => t.stop()); pipStream = null; }
      cancelAnimationFrame(pipRaf);
      document.getElementById('cam-pip').hidden = true;
    });

    // Lens zoom
    document.getElementById('btn-lens-zoom-in').addEventListener('click', () => {
      lensZoom = Math.min(lensZoom + 20, 300);
      document.getElementById('web-iframe').style.transform = `scale(${lensZoom / 100})`;
      document.getElementById('web-iframe').style.transformOrigin = 'top left';
      document.getElementById('lens-zoom-label').textContent = lensZoom + '%';
    });
    document.getElementById('btn-lens-zoom-out').addEventListener('click', () => {
      lensZoom = Math.max(lensZoom - 20, 40);
      document.getElementById('web-iframe').style.transform = `scale(${lensZoom / 100})`;
      document.getElementById('web-iframe').style.transformOrigin = 'top left';
      document.getElementById('lens-zoom-label').textContent = lensZoom + '%';
    });
    // Tìm kiếm truyện trên các trang
    document.querySelectorAll('.search-site-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = document.getElementById('lens-search').value.trim();
        if (!q) { showToast('❌ Nhập tên truyện trước'); return; }
        const url = btn.dataset.search.replace('{q}', encodeURIComponent(q));
        if (btn.dataset.newtab) {
          window.open(url, '_blank');  // Google mở tab mới
        } else {
          document.getElementById('lens-url').value = url;
          loadURL(url);
        }
      });
    });
    document.getElementById('lens-search').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (!q) return;
        // Enter → tìm trên NetTruyện mặc định
        const url = `https://nettruyen1905.com/tim-truyen?keywords=${encodeURIComponent(q)}`;
        document.getElementById('lens-url').value = url;
        loadURL(url);
      }
    });
    initDraggable();
  }

  return { init };
})();

/* ============================================================
   7. SETTINGS
   ============================================================ */
const Settings = (() => {
  function init() {
    document.getElementById('btn-open-settings').addEventListener('click', openPanel);
    document.getElementById('btn-close-settings').addEventListener('click', closePanel);
    document.getElementById('toggle-dark').addEventListener('change', e => {
      document.body.classList.toggle('theme-dark', e.target.checked);
      document.body.classList.toggle('theme-light', !e.target.checked);
    });
    document.getElementById('toggle-hc').addEventListener('change', e => document.body.classList.toggle('high-contrast', e.target.checked));
    document.getElementById('toggle-lf').addEventListener('change', e => document.body.classList.toggle('large-font', e.target.checked));
    document.querySelectorAll('input[name="cb-global"]').forEach(r => {
      r.addEventListener('change', e => {
        const m = e.target.value;
        document.body.style.filter = m === 'none' ? '' : `url(#f-${m})`;
        showToast('🎨 Bộ lọc toàn trang: ' + (m === 'none' ? 'Bình thường' : m));
      });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
    // OS preferences
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.getElementById('toggle-dark').checked = true;
      document.body.classList.add('theme-dark'); document.body.classList.remove('theme-light');
    }
  }
  function openPanel() { const p = document.getElementById('settings-panel'); p.classList.add('open'); p.removeAttribute('aria-hidden'); document.getElementById('btn-open-settings').setAttribute('aria-expanded', 'true'); }
  function closePanel() { const p = document.getElementById('settings-panel'); p.classList.remove('open'); p.setAttribute('aria-hidden', 'true'); document.getElementById('btn-open-settings').setAttribute('aria-expanded', 'false'); }
  return { init, openPanel, closePanel };
})();

/* ============================================================
   8. HELPERS + NAVIGATION + INIT
   ============================================================ */

// Slider setup helper
function setupSlider(id, valId, setter, isPct = false) {
  const el = document.getElementById(id);
  const vl = document.getElementById(valId);
  if (!el) return;
  el.addEventListener('input', () => {
    const v = parseInt(el.value);
    if (vl) vl.textContent = isPct ? v + '%' : v;
    setter(v);
  });
}

// Cập nhật pills active
function updatePills(name) {
  document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
    const lbl = r.closest('.pill-label');
    if (lbl) lbl.classList.toggle('active', r.checked);
  });
}

// Toast
let _tt = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.removeAttribute('aria-hidden'); t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => { t.classList.remove('show'); t.setAttribute('aria-hidden', 'true'); }, 3000);
}

// Navigation  
function navigateTo(page) {
  document.querySelectorAll('.page-section').forEach(s => { s.classList.remove('active'); s.hidden = true; });
  const target = document.getElementById('section-' + page);
  if (target) { target.classList.add('active'); target.hidden = false; }
  document.querySelectorAll('.nav-link').forEach(l => {
    const a = l.dataset.page === page;
    l.classList.toggle('active', a);
    l.setAttribute('aria-current', a ? 'page' : 'false');
  });
  if (page === 'library') LibraryModule.render();
  Settings.closePanel();
  const sidebar =
    document.querySelector(".sidebar");
  if (sidebar) {
    sidebar.classList.remove("open");
  }
}

function initNavigation() {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', e => {
      e.preventDefault();
      if (l.dataset.page) navigateTo(l.dataset.page);
    });
  });
  document.getElementById('btn-clear-library')?.addEventListener('click', LibraryModule.clearAll);
}
// INIT
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  Settings.init();
  CameraModule.init();
  FileReaderModule.init();
  WebLensModule.init();
  navigateTo('home');
  console.log('%c✅ Vision Voice v2 loaded!', 'color:#5B4FE9;font-weight:bold;font-size:14px');
});
//login
function registerUser() {
  const user =
    document.getElementById("username").value;
  const pass =
    document.getElementById("password").value;
  if (!user || !pass) {
    alert("Vui lòng nhập đầy đủ");
    return;
  }
  localStorage.setItem("user_" + user, pass
  );
  alert("Đăng ký thành công");
}
//đăng nhập
function loginUser() {
  const user =
    document.getElementById("username").value;
  const pass =
    document.getElementById("password").value;
  const saved =
    localStorage.getItem("user_" + user);
  if (saved === pass) {
    localStorage.setItem("currentUser", user);
    document.getElementById("login-status").textContent = "Đang đăng nhập: " + user;
    alert("Đăng nhập thành công");
  } else {
    alert("Sai tài khoản hoặc mật khẩu");
  }
}
window.addEventListener("load", () => {
  const currentUser =
    localStorage.getItem("currentUser");
  if (currentUser) {
    document.getElementById("login-status").textContent = "Đang đăng nhập: " + currentUser;
  }
});
function logoutUser() {
  localStorage.removeItem(
    "currentUser"
  );
  document.getElementById(
    "login-status"
  ).textContent = "";
  alert("Đã đăng xuất");
}
//mobie
const mobileBtn =
  document.getElementById("mobile-menu-btn");
const sidebar =
  document.querySelector(".sidebar");
if (mobileBtn && sidebar) {
  mobileBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}