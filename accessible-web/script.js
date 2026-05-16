/* ============================================================
   script.js – SáchNói Accessibility Website
   Hỗ trợ WCAG 2.2: Voice, Keyboard Nav, Theme, Audio Player
   ============================================================ */

/* ── 1. DỮ LIỆU SÁCH (dữ liệu mẫu) ────────────────────── */
const BOOKS = [
  {
    id: 1,
    title: "Đắc Nhân Tâm",
    author: "Dale Carnegie",
    desc: "Nghệ thuật thu phục lòng người – cuốn sách kinh điển về kỹ năng giao tiếp và tạo dựng mối quan hệ.",
    emoji: "🤝",
    color: "#3949ab",
    // Dùng file audio mẫu công khai (Creative Commons)
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "8 giờ 24 phút"
  },
  {
    id: 2,
    title: "Nhà Giả Kim",
    author: "Paulo Coelho",
    desc: "Hành trình đi tìm kho báu và khám phá bản thân của chàng trai trẻ Santiago.",
    emoji: "✨",
    color: "#e65100",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "4 giờ 13 phút"
  },
  {
    id: 3,
    title: "Tư Duy Phản Biện",
    author: "Tom Chatfield",
    desc: "Rèn luyện kỹ năng phân tích và đánh giá thông tin trong thế giới hiện đại đầy thông tin.",
    emoji: "🧠",
    color: "#2e7d32",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: "6 giờ 05 phút"
  },
  {
    id: 4,
    title: "Khéo Léo Chuyện Tiền Bạc",
    author: "Morgan Housel",
    desc: "Cách suy nghĩ đúng đắn về tài chính cá nhân và đầu tư qua những câu chuyện thực tế.",
    emoji: "💰",
    color: "#6a1b9a",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: "5 giờ 48 phút"
  },
  {
    id: 5,
    title: "Atomic Habits",
    author: "James Clear",
    desc: "Xây dựng thói quen tốt và phá bỏ thói quen xấu thông qua những thay đổi nhỏ nhưng mạnh mẽ.",
    emoji: "⚡",
    color: "#00838f",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: "5 giờ 35 phút"
  },
  {
    id: 6,
    title: "Sapiens: Lược Sử Loài Người",
    author: "Yuval Noah Harari",
    desc: "Hành trình 70,000 năm của loài người từ thời đồ đá đến thế kỷ 21.",
    emoji: "🌍",
    color: "#4527a0",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration: "15 giờ 17 phút"
  },
  {
    id: 7,
    title: "Mindset: Thay Đổi Tư Duy",
    author: "Carol S. Dweck",
    desc: "Tư duy cầu tiến và tư duy cố định ảnh hưởng như thế nào đến thành công của bạn.",
    emoji: "🌱",
    color: "#558b2f",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    duration: "7 giờ 22 phút"
  },
  {
    id: 8,
    title: "Trí Tuệ Nhân Tạo",
    author: "Nick Bostrom",
    desc: "Tìm hiểu về tương lai của AI và những thách thức đối với nhân loại trong kỷ nguyên máy móc thông minh.",
    emoji: "🤖",
    color: "#1565c0",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    duration: "9 giờ 51 phút"
  }
];

/* ── 2. TRẠNG THÁI ỨNG DỤNG (State) ────────────────────── */
const state = {
  voiceEnabled: true,     // Bật/tắt giọng đọc
  voiceSpeed: 0.8,        // Tốc độ giọng đọc
  fontScale: 1,           // Cỡ chữ (1 = 100%)
  theme: 'default',       // Giao diện màu
  currentPage: 'home',    // Trang hiện tại
  currentBook: null,      // Sách đang phát
  isPlaying: false,       // Đang phát?
  history: []             // Lịch sử nghe
};

/* ── 3. WEB SPEECH API (Giọng đọc màn hình) ────────────── */
// Dùng để đọc nội dung khi người dùng di chuột

let speechSynth = window.speechSynthesis;
let currentUtterance = null;
let selectedVoice = null; // Giọng tiếng Việt đang được chọn
/**
 * Phát giọng đọc cho đoạn text
 * @param {string} text - Nội dung cần đọc
 */
function speak(text) {
  if (!state.voiceEnabled || !speechSynth) return;
  if (!text || text.trim().length === 0) return;

  speechSynth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Dùng giọng đã chọn, hoặc tự tìm giọng tốt nhất
  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  } else {
    utterance.lang = 'vi-VN';
  }

  utterance.rate = state.voiceSpeed;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Fix lỗi Chrome bị im lặng giữa chừng sau ~15 giây
  const resumeTimer = setInterval(() => {
    if (!speechSynth.speaking) { clearInterval(resumeTimer); return; }
    speechSynth.pause();
    speechSynth.resume();
  }, 10000);
  utterance.onend = () => clearInterval(resumeTimer);

  speechSynth.speak(utterance);
  /* ── HÀM TÌM GIỌNG TIẾNG VIỆT TỐT NHẤT ────────────────── */
  // Danh sách tên giọng ưu tiên, từ tốt nhất đến dự phòng
  const VI_VOICE_PRIORITY = [
    'Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)', // Edge Windows - nữ
    'Microsoft NamMinh Online (Natural) - Vietnamese (Vietnam)',// Edge Windows - nam
    'com.apple.voice.compact.vi-VN.Linh',                      // Safari Mac/iOS
    'Linh',                                                     // Safari tên ngắn
    'Google tiếng Việt',                                        // Chrome
  ];

  function pickBestVietnameseVoice() {
    const voices = speechSynth.getVoices();
    if (!voices.length) return null;

    // Thử khớp từng tên ưu tiên
    for (const name of VI_VOICE_PRIORITY) {
      const found = voices.find(v =>
        v.name.toLowerCase().includes(name.toLowerCase())
      );
      if (found) return found;
    }

    // Fallback: bất kỳ giọng vi-VN nào
    return voices.find(v => v.lang === 'vi-VN')
      || voices.find(v => v.lang.startsWith('vi'))
      || null;
  }

  /* ── HÀM ĐỔ DANH SÁCH GIỌNG VÀO DROPDOWN ───────────────── */
  function populateVoiceSelect() {
    const select = document.getElementById('voice-select');
    if (!select) return;

    // Lấy tất cả giọng tiếng Việt trên thiết bị
    const viVoices = speechSynth.getVoices().filter(v =>
      v.lang.startsWith('vi') || v.lang.includes('VN')
    );

    if (viVoices.length === 0) {
      select.innerHTML = `<option value="">
      ⚠️ Thiết bị chưa cài giọng tiếng Việt
    </option>`;
      document.getElementById('voice-hint').innerHTML =
        '⚠️ Dùng <strong>Microsoft Edge</strong> hoặc cài thêm giọng tiếng Việt trong phần cài đặt hệ thống.';
      return;
    }

    // Tạo option cho từng giọng
    select.innerHTML = viVoices.map((v, i) => {
      const isSelected = selectedVoice && v.name === selectedVoice.name;
      const type = v.localService ? '📴 Offline' : '🌐 Online';
      return `<option value="${i}" ${isSelected ? 'selected' : ''}>
      ${type} – ${v.name}
    </option>`;
    }).join('');

    // Khi người dùng chọn giọng khác
    select.addEventListener('change', (e) => {
      selectedVoice = viVoices[parseInt(e.target.value)];
      localStorage.setItem('sachNoi_voiceName', selectedVoice.name);
      speak(`Xin chào! Đây là giọng ${selectedVoice.name}. Bạn có nghe rõ không?`);
    });
  }
}
/**
 * Dừng giọng đọc
 */
function stopSpeak() {
  if (speechSynth) speechSynth.cancel();
}

/* ── 4. GẮN SỰ KIỆN GIỌNG ĐỌC CHO TẤT CẢ PHẦN TỬ ──────── */
/**
 * Gắn hover voice cho tất cả phần tử có thuộc tính data-speak
 * Cũng tự động đọc aria-label nếu không có data-speak
 */
function attachVoiceEvents() {
  // Lấy tất cả phần tử tương tác
  const elements = document.querySelectorAll(
    '[data-speak], button, a, input, [role="menuitem"], .book-btn'
  );

  elements.forEach(el => {
    // Tránh gắn event 2 lần
    if (el.dataset.voiceAttached) return;
    el.dataset.voiceAttached = 'true';

    // Khi di chuột vào (hover)
    el.addEventListener('mouseenter', () => {
      const text = el.dataset.speak
        || el.getAttribute('aria-label')
        || el.textContent.trim().substring(0, 100); // Tối đa 100 ký tự
      speak(text);
    });

    // Khi focus bằng bàn phím
    el.addEventListener('focus', () => {
      const text = el.dataset.speak
        || el.getAttribute('aria-label')
        || el.textContent.trim().substring(0, 100);
      speak(text);
    });

    // Khi rời khỏi phần tử
    el.addEventListener('mouseleave', stopSpeak);
  });
}

/* ── 5. ĐIỀU HƯỚNG TRANG ────────────────────────────────── */
/**
 * Chuyển đến trang khác
 * @param {string} pageName - Tên trang ('home', 'settings', 'login')
 */
function navigateTo(pageName) {
  // Ẩn tất cả trang
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Hiện trang cần đến
  const target = document.getElementById('page-' + pageName);
  if (target) {
    target.classList.add('active');
    state.currentPage = pageName;

    // Focus vào nội dung chính cho screen reader
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.focus();

    // Thông báo cho screen reader
    announce('Đã chuyển đến trang ' + pageName);

    // Cập nhật active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.pageTarget === pageName) link.classList.add('active');
    });

    // Đóng nav mobile
    const nav = document.getElementById('main-nav');
    nav.classList.remove('open');
    document.getElementById('hamburger').setAttribute('aria-expanded', 'false');

    // Cập nhật setting page nếu cần
    if (pageName === 'settings') updateSettingsPage();
  }
}

/* ── 6. THÔNG BÁO CHO SCREEN READER ────────────────────── */
/**
 * Đưa thông báo vào vùng aria-live để screen reader đọc
 * @param {string} message
 */
function announce(message) {
  const region = document.getElementById('sr-announce');
  if (region) {
    region.textContent = '';
    // Cần delay nhỏ để screen reader nhận thay đổi
    setTimeout(() => { region.textContent = message; }, 100);
  }
}

/* ── 7. RENDER DANH SÁCH SÁCH ───────────────────────────── */
function renderBooks() {
  const grid = document.getElementById('books-grid');
  if (!grid) return;

  grid.innerHTML = ''; // Xóa cũ

  BOOKS.forEach(book => {
    // Tạo card
    const card = document.createElement('article');
    card.className = 'book-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `Sách: ${book.title} của ${book.author}`);

    card.innerHTML = `
      <!-- Ảnh bìa (placeholder với emoji và màu sắc) -->
      <div
        class="book-cover-placeholder"
        style="background: linear-gradient(135deg, ${book.color}, ${adjustColor(book.color, -40)});"
        role="img"
        aria-label="Bìa sách ${book.title}"
      >
        <span aria-hidden="true">${book.emoji}</span>
        <span>${book.title}</span>
      </div>

      <!-- Nội dung card -->
      <div class="book-body">
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">✍️ ${book.author}</p>
        <p class="book-desc">${book.desc}</p>
        <p class="book-author">⏱ ${book.duration}</p>

        <!-- Nút nghe -->
        <button
          class="book-btn"
          data-book-id="${book.id}"
          aria-label="Nghe sách ${book.title} của ${book.author}"
          data-speak="Nghe sách ${book.title} của ${book.author}"
        >
          🎧 Nghe ngay
        </button>
      </div>
    `;

    grid.appendChild(card);
  });

  // Gắn event click cho nút nghe
  grid.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookId = parseInt(btn.dataset.bookId);
      const book = BOOKS.find(b => b.id === bookId);
      if (book) playBook(book);
    });
  });

  // Gắn lại voice events cho phần tử mới
  attachVoiceEvents();
}

/**
 * Làm tối màu hex
 * @param {string} hex - Màu hex
 * @param {number} amount - Số âm để tối hơn
 */
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ── 8. AUDIO PLAYER ────────────────────────────────────── */
const audioEl = document.getElementById('audio-element');
const playerEl = document.getElementById('audio-player');

/**
 * Phát sách audio
 * @param {object} book - Đối tượng sách
 */
function playBook(book) {
  state.currentBook = book;

  // Cập nhật giao diện player
  document.getElementById('player-title').textContent = book.title;
  document.getElementById('player-author').textContent = book.author;

  // Hiện player
  playerEl.hidden = false;
  playerEl.removeAttribute('hidden');

  // Set src audio
  audioEl.src = book.audio;
  audioEl.load();
  audioEl.play()
    .then(() => {
      state.isPlaying = true;
      updatePlayButton();
    })
    .catch(err => {
      console.warn('Không thể phát audio:', err);
      // Vẫn hiện player dù không phát được (demo)
      state.isPlaying = false;
      updatePlayButton();
    });

  // Thêm vào lịch sử
  addToHistory(book);

  // Thông báo
  speak(`Đang phát sách: ${book.title} của ${book.author}`);
  announce(`Đang phát: ${book.title}`);
}

/**
 * Cập nhật nút play/pause
 */
function updatePlayButton() {
  const btn = document.getElementById('player-play');
  btn.textContent = state.isPlaying ? '⏸' : '▶';
  btn.setAttribute('aria-label', state.isPlaying ? 'Tạm dừng' : 'Phát');
}

// Sự kiện play/pause
document.getElementById('player-play').addEventListener('click', () => {
  if (state.isPlaying) {
    audioEl.pause();
    state.isPlaying = false;
    speak('Tạm dừng');
  } else {
    audioEl.play().catch(() => { });
    state.isPlaying = true;
    speak('Tiếp tục phát');
  }
  updatePlayButton();
});

// Lùi 10 giây
document.getElementById('player-prev').addEventListener('click', () => {
  audioEl.currentTime = Math.max(0, audioEl.currentTime - 10);
  speak('Lùi 10 giây');
});

// Tiến 10 giây
document.getElementById('player-next').addEventListener('click', () => {
  audioEl.currentTime = Math.min(audioEl.duration || 0, audioEl.currentTime + 10);
  speak('Tiến 10 giây');
});

// Đóng player
document.getElementById('player-close').addEventListener('click', () => {
  audioEl.pause();
  playerEl.hidden = true;
  state.isPlaying = false;
  state.currentBook = null;
  speak('Đã đóng trình phát');
  announce('Đóng trình phát nhạc');
});

// Cập nhật thanh tiến trình
audioEl.addEventListener('timeupdate', () => {
  if (!audioEl.duration) return;
  const pct = (audioEl.currentTime / audioEl.duration) * 100;
  const progressBar = document.getElementById('player-progress');
  progressBar.value = pct;
  progressBar.setAttribute('aria-valuenow', Math.round(pct));

  document.getElementById('player-current').textContent = formatTime(audioEl.currentTime);
  document.getElementById('player-duration').textContent = formatTime(audioEl.duration);
});

// Kéo thanh tiến trình
document.getElementById('player-progress').addEventListener('input', (e) => {
  if (audioEl.duration) {
    audioEl.currentTime = (e.target.value / 100) * audioEl.duration;
  }
});

// Khi kết thúc bài
audioEl.addEventListener('ended', () => {
  state.isPlaying = false;
  updatePlayButton();
  announce('Đã phát xong sách');
});

/**
 * Format thời gian giây → mm:ss
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ── 9. LỊCH SỬ NGHE (localStorage) ────────────────────── */
/**
 * Thêm sách vào lịch sử
 */
function addToHistory(book) {
  // Tải lịch sử từ localStorage
  let history = JSON.parse(localStorage.getItem('sachNoi_history') || '[]');

  // Xóa nếu đã có sách này trong lịch sử (tránh trùng)
  history = history.filter(h => h.id !== book.id);

  // Thêm vào đầu danh sách
  history.unshift({
    id: book.id,
    title: book.title,
    author: book.author,
    emoji: book.emoji,
    listenedAt: new Date().toLocaleString('vi-VN')
  });

  // Giới hạn 20 mục
  history = history.slice(0, 20);

  // Lưu lại
  localStorage.setItem('sachNoi_history', JSON.stringify(history));
  state.history = history;

  renderHistory();
}

/**
 * Render danh sách lịch sử nghe
 */
function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const history = JSON.parse(localStorage.getItem('sachNoi_history') || '[]');

  if (history.length === 0) {
    container.innerHTML = '<div class="history-empty">📭 Bạn chưa nghe sách nào. Hãy bắt đầu từ danh sách sách!</div>';
    return;
  }

  container.innerHTML = '';

  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.setAttribute('role', 'listitem');
    div.setAttribute('aria-label', `${item.title} của ${item.author}, nghe lúc ${item.listenedAt}`);
    div.innerHTML = `
      <span class="history-emoji" aria-hidden="true">${item.emoji}</span>
      <div class="history-info">
        <strong>${item.title}</strong>
        <small>✍️ ${item.author} · 🕐 ${item.listenedAt}</small>
      </div>
      <button
        class="btn btn-small btn-secondary"
        onclick="playBookById(${item.id})"
        aria-label="Nghe lại sách ${item.title}"
        data-speak="Nghe lại ${item.title}"
      >▶ Nghe lại</button>
    `;
    container.appendChild(div);
  });

  attachVoiceEvents();
}

/**
 * Phát sách theo id
 */
function playBookById(id) {
  const book = BOOKS.find(b => b.id === id);
  if (book) playBook(book);
}
// Đặt hàm global để onclick truy cập được
window.playBookById = playBookById;

/**
 * Xóa toàn bộ lịch sử
 */
function clearHistory() {
  if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử nghe không?')) {
    localStorage.removeItem('sachNoi_history');
    state.history = [];
    renderHistory();
    announce('Đã xóa toàn bộ lịch sử nghe');
    speak('Đã xóa toàn bộ lịch sử nghe');
  }
}

// Nút xóa lịch sử (trang home)
document.getElementById('btn-clear-history')?.addEventListener('click', clearHistory);
// Nút xóa lịch sử (trang settings)
document.getElementById('s-clear-history')?.addEventListener('click', clearHistory);

/* ── 10. THEME (Đổi giao diện màu sắc) ─────────────────── */
/**
 * Áp dụng theme
 * @param {string} themeName - Tên theme
 */
function applyTheme(themeName) {
  // Xóa tất cả class theme cũ
  document.body.className = document.body.className
    .replace(/theme-\S+/g, '')
    .trim();

  // Thêm class theme mới
  document.body.classList.add('theme-' + themeName);
  state.theme = themeName;

  // Lưu vào localStorage
  localStorage.setItem('sachNoi_theme', themeName);

  // Cập nhật active state của nút theme
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeName);
    btn.setAttribute('aria-pressed', btn.dataset.theme === themeName ? 'true' : 'false');
  });

  announce('Đã đổi giao diện: ' + themeName);
}

// Gắn sự kiện cho tất cả nút đổi theme
document.querySelectorAll('[data-theme]').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

// Nút mở/đóng dropdown theme
const themeToggle = document.getElementById('btn-theme-toggle');
const themeDropdown = document.getElementById('theme-dropdown');

themeToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = !themeDropdown.hidden;
  themeDropdown.hidden = isOpen;
  themeToggle.setAttribute('aria-expanded', !isOpen);
});

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', () => {
  if (themeDropdown && !themeDropdown.hidden) {
    themeDropdown.hidden = true;
    themeToggle.setAttribute('aria-expanded', 'false');
  }
});

/* ── 11. FONT SIZE (Cỡ chữ) ────────────────────────────── */
const MIN_SCALE = 0.8;  // 80%
const MAX_SCALE = 1.5;  // 150%
const STEP = 0.1;

/**
 * Cập nhật cỡ chữ
 */
function updateFontSize() {
  document.documentElement.style.setProperty('--font-scale', state.fontScale);
  const pct = Math.round(state.fontScale * 100) + '%';

  // Cập nhật hiển thị
  const display = document.getElementById('font-size-display');
  if (display) display.textContent = pct;

  localStorage.setItem('sachNoi_fontScale', state.fontScale);
  announce('Cỡ chữ: ' + pct);
}

// Nút tăng font (header)
document.getElementById('btn-font-increase')?.addEventListener('click', () => {
  if (state.fontScale < MAX_SCALE) {
    state.fontScale = Math.round((state.fontScale + STEP) * 10) / 10;
    updateFontSize();
    speak('Tăng cỡ chữ');
  }
});

// Nút giảm font (header)
document.getElementById('btn-font-decrease')?.addEventListener('click', () => {
  if (state.fontScale > MIN_SCALE) {
    state.fontScale = Math.round((state.fontScale - STEP) * 10) / 10;
    updateFontSize();
    speak('Giảm cỡ chữ');
  }
});

// Nút settings
document.getElementById('s-font-inc')?.addEventListener('click', () => {
  if (state.fontScale < MAX_SCALE) {
    state.fontScale = Math.round((state.fontScale + STEP) * 10) / 10;
    updateFontSize();
    speak('Tăng cỡ chữ');
  }
});

document.getElementById('s-font-dec')?.addEventListener('click', () => {
  if (state.fontScale > MIN_SCALE) {
    state.fontScale = Math.round((state.fontScale - STEP) * 10) / 10;
    updateFontSize();
    speak('Giảm cỡ chữ');
  }
});

document.getElementById('s-font-reset')?.addEventListener('click', () => {
  state.fontScale = 1;
  updateFontSize();
  speak('Khôi phục cỡ chữ mặc định');
});

/* ── 12. VOICE TOGGLE ───────────────────────────────────── */
const voiceHeaderBtn = document.getElementById('btn-voice-toggle');
const voiceSettingToggle = document.getElementById('s-voice-toggle');

function setVoice(enabled) {
  state.voiceEnabled = enabled;
  localStorage.setItem('sachNoi_voice', enabled);

  // Cập nhật nút header
  if (voiceHeaderBtn) {
    voiceHeaderBtn.textContent = enabled ? '🔊' : '🔇';
    voiceHeaderBtn.setAttribute('aria-label', enabled ? 'Tắt giọng đọc' : 'Bật giọng đọc');
    voiceHeaderBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }

  // Cập nhật toggle settings
  if (voiceSettingToggle) {
    voiceSettingToggle.checked = enabled;
    voiceSettingToggle.setAttribute('aria-checked', enabled ? 'true' : 'false');
  }

  if (!enabled) stopSpeak();
  else speak('Đã bật giọng đọc màn hình');
}

voiceHeaderBtn?.addEventListener('click', () => setVoice(!state.voiceEnabled));
voiceSettingToggle?.addEventListener('change', (e) => setVoice(e.target.checked));

// Tốc độ giọng đọc
document.getElementById('voice-speed')?.addEventListener('input', (e) => {
  state.voiceSpeed = parseFloat(e.target.value);
  document.getElementById('voice-speed-val').textContent = state.voiceSpeed.toFixed(1) + 'x';
  localStorage.setItem('sachNoi_voiceSpeed', state.voiceSpeed);
});

/* ── 13. HAMBURGER (Mobile Nav) ─────────────────────────── */
document.getElementById('hamburger')?.addEventListener('click', () => {
  const nav = document.getElementById('main-nav');
  const isOpen = nav.classList.toggle('open');
  document.getElementById('hamburger').setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  speak(isOpen ? 'Mở menu điều hướng' : 'Đóng menu điều hướng');
});

/* ── 14. ĐIỀU HƯỚNG TRANG BẰNG LINK ────────────────────── */
// Xử lý tất cả link có data-page-target
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-page-target]');
  if (link) {
    e.preventDefault();
    navigateTo(link.dataset.pageTarget);
  }

  // Link anchor nội trang (href bắt đầu bằng #)
  const anchor = e.target.closest('a[href^="#"]');
  if (anchor && !anchor.dataset.pageTarget) {
    const targetId = anchor.getAttribute('href').substring(1);
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      e.preventDefault();
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});

/* ── 15. FORM ĐĂNG NHẬP ─────────────────────────────────── */
document.getElementById('btn-login')?.addEventListener('click', () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const successEl = document.getElementById('login-success');

  // Ẩn thông báo cũ
  errorEl.hidden = true;
  successEl.hidden = true;

  // Validate đơn giản
  if (!email) {
    showFormMsg(errorEl, '⚠️ Vui lòng nhập email của bạn.');
    document.getElementById('login-email').focus();
    speak('Vui lòng nhập email của bạn');
    return;
  }

  if (!email.includes('@')) {
    showFormMsg(errorEl, '⚠️ Email không hợp lệ. Ví dụ: ten@email.com');
    speak('Email không hợp lệ');
    return;
  }

  if (!password || password.length < 6) {
    showFormMsg(errorEl, '⚠️ Mật khẩu phải có ít nhất 6 ký tự.');
    document.getElementById('login-password').focus();
    speak('Mật khẩu phải có ít nhất 6 ký tự');
    return;
  }

  // Demo: chấp nhận mọi thông tin hợp lệ
  showFormMsg(successEl, '✅ Đăng nhập thành công! Chào mừng bạn đến SáchNói.');
  speak('Đăng nhập thành công! Chào mừng bạn đến SáchNói');

  // Chuyển về trang chủ sau 1.5 giây
  setTimeout(() => navigateTo('home'), 1500);
});

// Nút dùng thử
document.getElementById('btn-demo')?.addEventListener('click', () => {
  speak('Chuyển đến trang chủ ở chế độ dùng thử');
  navigateTo('home');
});

/**
 * Hiện thông báo form
 */
function showFormMsg(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

// Nút hiện/ẩn mật khẩu
document.getElementById('btn-show-pass')?.addEventListener('click', () => {
  const input = document.getElementById('login-password');
  const btn = document.getElementById('btn-show-pass');
  const isShowing = input.type === 'text';
  input.type = isShowing ? 'password' : 'text';
  btn.setAttribute('aria-pressed', !isShowing ? 'true' : 'false');
  btn.textContent = isShowing ? '👁' : '🙈';
  speak(isShowing ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
});

/* ── 16. ĐIỀU HƯỚNG BẰNG BÀN PHÍM ─────────────────────── */
// Phím Escape đóng dropdown
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Đóng theme dropdown
    if (themeDropdown && !themeDropdown.hidden) {
      themeDropdown.hidden = true;
      themeToggle.setAttribute('aria-expanded', 'false');
      themeToggle.focus();
    }
    // Đóng player
    if (!playerEl.hidden) {
      audioEl.pause();
      playerEl.hidden = true;
      state.isPlaying = false;
    }
  }
});

// Điều hướng bàn phím trong dropdown menu bằng mũi tên
themeDropdown?.addEventListener('keydown', (e) => {
  const items = Array.from(themeDropdown.querySelectorAll('[role="menuitem"]'));
  const current = document.activeElement;
  const idx = items.indexOf(current);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    items[(idx + 1) % items.length]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    items[(idx - 1 + items.length) % items.length]?.focus();
  }
});

/* ── 17. TRANG SETTINGS – CẬP NHẬT UI ──────────────────── */
function updateSettingsPage() {
  // Cập nhật đếm lịch sử
  const history = JSON.parse(localStorage.getItem('sachNoi_history') || '[]');
  const countEl = document.getElementById('history-count');
  if (countEl) countEl.textContent = `Bạn đã nghe ${history.length} sách trong lịch sử.`;
}

/* ── 18. KHỞI TẠO (Load state từ localStorage) ─────────── */
function init() {
  // Tải theme
  const savedTheme = localStorage.getItem('sachNoi_theme') || 'default';
  applyTheme(savedTheme);

  // Tải cỡ chữ
  const savedFont = parseFloat(localStorage.getItem('sachNoi_fontScale') || '1');
  state.fontScale = savedFont;
  updateFontSize();

  // Tải voice
  const savedVoice = localStorage.getItem('sachNoi_voice');
  if (savedVoice !== null) {
    setVoice(savedVoice === 'true');
  }

  // Tải tốc độ giọng đọc
  const savedSpeed = parseFloat(localStorage.getItem('sachNoi_voiceSpeed') || '1');
  state.voiceSpeed = savedSpeed;
  const speedInput = document.getElementById('voice-speed');
  if (speedInput) speedInput.value = savedSpeed;
  const speedVal = document.getElementById('voice-speed-val');
  if (speedVal) speedVal.textContent = savedSpeed.toFixed(1) + 'x';

  // Render sách và lịch sử
  renderBooks();
  renderHistory();

  // Gắn voice events lần đầu
  attachVoiceEvents();

  // Thông báo khi load xong
  announce('Trang SáchNói đã sẵn sàng. Sử dụng Tab để điều hướng bằng bàn phím.');
  // Khi danh sách giọng sẵn sàng (Chrome load bất đồng bộ)
  speechSynth.addEventListener('voiceschanged', () => {
    selectedVoice = pickBestVietnameseVoice();
    populateVoiceSelect();

    // Khôi phục giọng đã chọn lần trước
    const savedVoiceName = localStorage.getItem('sachNoi_voiceName');
    if (savedVoiceName) {
      const voices = speechSynth.getVoices();
      const saved = voices.find(v => v.name === savedVoiceName);
      if (saved) selectedVoice = saved;
    }
  });

  // Thử chọn ngay (Edge/Safari load đồng bộ)
  selectedVoice = pickBestVietnameseVoice();
  populateVoiceSelect();

  // Nút "Thử giọng"
  document.getElementById('btn-test-voice')?.addEventListener('click', () => {
    speak('Xin chào! Đây là giọng đọc của SáchNói. Chúc bạn nghe sách vui vẻ!');
  });
}

/* ── 19. THEO DÕI DOM THAY ĐỔI – tự gắn voice events ───── */
// Khi có phần tử mới được thêm vào DOM
const observer = new MutationObserver(() => {
  attachVoiceEvents();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

/* ── CHẠY KHI TRANG LOAD XONG ────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
