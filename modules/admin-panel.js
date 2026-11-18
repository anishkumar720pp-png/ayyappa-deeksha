window.AdminPanelModule = (function () {
  const PIN_KEY = "ayyappa_admin_pin";
  const SESSION_KEY = "ayyappa_admin_logged_in";
  const CUSTOM_DATA_KEY = "ayyappa_custom_content_v1";
  const DEFAULT_PIN = "108108";

  function getPin() {
    return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
  }

  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  }

  function getCustomData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CUSTOM_DATA_KEY) || "null") || {};
      return {
        guruAvatar: parsed.guruAvatar || null,
        cardOverrides: parsed.cardOverrides || {},
        deletedCardIds: parsed.deletedCardIds || [],
        extraVisualCards: parsed.extraVisualCards || [],
        extraQAs: parsed.extraQAs || [],
        extraStories: parsed.extraStories || [],
        extraBhajans: parsed.extraBhajans || []
      };
    } catch (e) {
      return { guruAvatar: null, cardOverrides: {}, deletedCardIds: [], extraVisualCards: [], extraQAs: [], extraStories: [], extraBhajans: [] };
    }
  }

  function saveCustomData(data) {
    localStorage.setItem(CUSTOM_DATA_KEY, JSON.stringify(data));
  }

  function applyCustomContentToApp() {
    const data = getCustomData();

    // 1. Custom Guru Swami Avatar
    const avatarContainer = document.getElementById("guru-avatar-container");
    if (avatarContainer) {
      if (data.guruAvatar) {
        avatarContainer.innerHTML = `<img src="${data.guruAvatar}" alt="Sri Guru Swami" class="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-full object-cover border-4 border-temple-gold shadow-xl" />`;
      } else if (window.DEFAULT_GURU_SVG) {
        avatarContainer.innerHTML = window.DEFAULT_GURU_SVG;
      }
    }

    // 2. Visual Cards (Base + Overrides + Deletions + Custom Cards)
    if (window.BASE_VISUAL_CARDS) {
      let mergedCards = window.BASE_VISUAL_CARDS
        .filter((c) => !data.deletedCardIds.includes(c.id))
        .map((c) => (data.cardOverrides[c.id] ? { ...c, ...data.cardOverrides[c.id] } : c));

      data.extraVisualCards.forEach((c) => {
        if (!data.deletedCardIds.includes(c.id)) {
          mergedCards.push(data.cardOverrides[c.id] ? { ...c, ...data.cardOverrides[c.id] } : c);
        }
      });
      window.VISUAL_CARDS_DATA = mergedCards;
    }

    // 3. Extra Guru Q&As
    if (window.GURU_QA_DATA && Array.isArray(data.extraQAs)) {
      data.extraQAs.forEach((qa) => {
        if (!window.GURU_QA_DATA.some((q) => q.id === qa.id)) {
          window.GURU_QA_DATA.unshift(qa);
        }
      });
    }

    // 4. Extra Parayana Stories
    if (window.PARAYANA_STORIES && Array.isArray(data.extraStories)) {
      data.extraStories.forEach((st) => {
        const idx = window.PARAYANA_STORIES.findIndex((s) => s.day === st.day);
        if (idx >= 0) window.PARAYANA_STORIES[idx] = st;
        else {
          window.PARAYANA_STORIES.push(st);
          window.PARAYANA_STORIES.sort((a, b) => a.day - b.day);
        }
      });
    }

    // 5. Extra Bhajans
    if (window.BHAJANS_DATA && Array.isArray(data.extraBhajans)) {
      data.extraBhajans.forEach((bh) => {
        if (!window.BHAJANS_DATA.some((b) => b.id === bh.id)) {
          window.BHAJANS_DATA.push(bh);
        }
      });
    }
  }

  function resizeImageFile(file, maxW = 520) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, maxW / img.width);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function populateCardEditorDropdown() {
    const sel = document.getElementById("admin-card-select");
    if (!sel || !window.VISUAL_CARDS_DATA) return;
    sel.innerHTML = `<option value="__new__">➕ Create Brand New Visual Card</option>` +
      window.VISUAL_CARDS_DATA.map((c, idx) =>
        `<option value="${c.id}">✏️ Edit Card #${idx + 1}: ${c.title.en}</option>`
      ).join("");
  }

  function fillCardFormForSelection(cardId) {
    const delBtn = document.getElementById("admin-delete-card-btn");
    const saveBtn = document.getElementById("admin-save-card-btn");
    if (cardId === "__new__") {
      document.getElementById("admin-card-title-en").value = "";
      document.getElementById("admin-card-title-te").value = "";
      document.getElementById("admin-card-title-hi").value = "";
      document.getElementById("admin-card-cap-en").value = "";
      document.getElementById("admin-card-cap-te").value = "";
      document.getElementById("admin-card-cap-hi").value = "";
      document.getElementById("admin-card-fullposter").checked = false;
      delBtn.classList.add("hidden");
      saveBtn.textContent = "➕ Add New Visual Card";
      return;
    }
    const card = window.VISUAL_CARDS_DATA.find((c) => c.id === cardId);
    if (!card) return;
    document.getElementById("admin-card-title-en").value = card.title.en || "";
    document.getElementById("admin-card-title-te").value = card.title.te || "";
    document.getElementById("admin-card-title-hi").value = card.title.hi || "";
    document.getElementById("admin-card-cap-en").value = card.caption.en || "";
    document.getElementById("admin-card-cap-te").value = card.caption.te || "";
    document.getElementById("admin-card-cap-hi").value = card.caption.hi || "";
    document.getElementById("admin-card-fullposter").checked = Boolean(card.isFullPoster);
    delBtn.classList.remove("hidden");
    saveBtn.textContent = "💾 Update Selected Card";
  }

  function injectAdminUI() {
    const modalHtml = `
      <div id="admin-modal" class="fixed inset-0 z-[999] hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-temple-900 border-2 border-temple-gold rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-amber-50 my-8 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-amber-500/25">
            <h2 class="font-display text-xl font-bold text-temple-gold">🔐 Peetam Admin Control Panel</h2>
            <button id="admin-close-btn" type="button" class="px-3 py-1 rounded-lg bg-temple-800 hover:bg-temple-700 text-amber-200 border border-amber-500/30 cursor-pointer">✕ Close</button>
          </div>

          <!-- Login View -->
          <div id="admin-login-view" class="space-y-4">
            <p class="text-sm text-amber-200/80">Enter your Peetam Admin Passcode to update Guru Swami images, visual cards, Q&As, stories, or bhajans.</p>
            <form id="admin-login-form" class="flex gap-2">
              <input type="password" id="admin-pin-input" placeholder="Enter Admin PIN (Default: 108108)" class="flex-1 bg-temple-800 text-amber-50 border border-amber-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-temple-gold" required />
              <button type="submit" class="btn-primary">Unlock Admin</button>
            </form>
            <p id="admin-login-error" class="text-xs text-red-400 hidden">Incorrect PIN. Please try again.</p>
          </div>

          <!-- Dashboard View -->
          <div id="admin-dashboard-view" class="hidden space-y-5">
            <div class="flex flex-wrap gap-2 border-b border-amber-500/20 pb-3">
              <button type="button" class="admin-subtab active px-3 py-1.5 rounded-lg text-xs font-bold bg-temple-saffron text-white cursor-pointer" data-atab="images">🖼️ Images & Cards</button>
              <button type="button" class="admin-subtab px-3 py-1.5 rounded-lg text-xs font-bold bg-temple-800 text-amber-200 cursor-pointer" data-atab="qa">🙏 Add Q&A</button>
              <button type="button" class="admin-subtab px-3 py-1.5 rounded-lg text-xs font-bold bg-temple-800 text-amber-200 cursor-pointer" data-atab="story">📖 Add Story</button>
              <button type="button" class="admin-subtab px-3 py-1.5 rounded-lg text-xs font-bold bg-temple-800 text-amber-200 cursor-pointer" data-atab="bhajan">🎶 Add Bhajan</button>
              <button type="button" class="admin-subtab px-3 py-1.5 rounded-lg text-xs font-bold bg-temple-800 text-amber-200 cursor-pointer" data-atab="security">🔑 Security & Export</button>
            </div>

            <!-- Subtab 1: Images & Trilingual Cards -->
            <div id="atab-images" class="admin-subpanel space-y-4">
              <div class="bg-temple-800 p-4 rounded-xl border border-amber-500/20 space-y-2">
                <h3 class="font-bold text-temple-gold text-sm">1. Change Sri Guru Swami Image</h3>
                <div class="flex flex-wrap gap-2 items-center pt-1">
                  <input type="file" id="admin-guru-img-input" accept="image/*" class="text-xs" />
                  <button type="button" id="admin-reset-guru-img" class="btn-ghost-sm">Reset Default Illustration</button>
                </div>
              </div>

              <form id="admin-add-card-form" class="bg-temple-800 p-4 rounded-xl border border-amber-500/20 space-y-2.5">
                <h3 class="font-bold text-temple-gold text-sm">2. Edit Existing Card or Add New 3-Language Card</h3>
                <select id="admin-card-select" class="w-full"></select>
                <p class="text-xs text-amber-200/70">Tip: Upload a clean illustration (no baked-in words/border) so the app displays your 3-language text cleanly around it.</p>
                <input type="file" id="admin-card-img" accept="image/*" class="text-xs w-full" />
                <label class="flex items-center gap-2 text-xs text-amber-200">
                  <input type="checkbox" id="admin-card-fullposter" />
                  <span>Full-poster image (hide outer parchment title/caption)</span>
                </label>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <input type="text" id="admin-card-title-en" placeholder="Title (English)*" required />
                  <input type="text" id="admin-card-title-te" placeholder="శీర్షిక (తెలుగు)" />
                  <input type="text" id="admin-card-title-hi" placeholder="शीर्षक (हिन्दी)" />
                </div>

                <textarea id="admin-card-cap-en" rows="2" placeholder="Explanation (English)*" required class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
                <textarea id="admin-card-cap-te" rows="2" placeholder="వివరణ (తెలుగు - Optional)" class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
                <textarea id="admin-card-cap-hi" rows="2" placeholder="विवरण (हिन्दी - Optional)" class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>

                <div class="flex flex-wrap gap-2 pt-1">
                  <button type="submit" id="admin-save-card-btn" class="btn-primary">➕ Add New Visual Card</button>
                  <button type="button" id="admin-delete-card-btn" class="btn-ghost-sm hidden text-red-300">🗑️ Remove Card</button>
                </div>
              </form>
            </div>

            <!-- Subtab 2: Add Q&A -->
            <form id="admin-add-qa-form" class="admin-subpanel hidden bg-temple-800 p-4 rounded-xl border border-amber-500/20 space-y-2.5">
              <h3 class="font-bold text-temple-gold text-sm">Add New Guru Swami Question & Answer</h3>
              <select id="admin-qa-cat" class="w-full">
                <option value="rules_do">What To Do (Rules)</option>
                <option value="rules_dont">What NOT To Do & Diet</option>
                <option value="significance">Significance (41 Days)</option>
                <option value="start_end">Start & End Rituals</option>
                <option value="practical">Work & Practical Doubts</option>
              </select>
              <input type="text" id="admin-qa-q-en" placeholder="Question (English)*" required class="w-full" />
              <textarea id="admin-qa-a-en" rows="3" placeholder="Guru Swami Answer (English)*" required class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
              <input type="text" id="admin-qa-q-te" placeholder="Question (Telugu - Optional)" class="w-full" />
              <textarea id="admin-qa-a-te" rows="2" placeholder="Answer (Telugu - Optional)" class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
              <input type="text" id="admin-qa-q-hi" placeholder="Question (Hindi - Optional)" class="w-full" />
              <textarea id="admin-qa-a-hi" rows="2" placeholder="Answer (Hindi - Optional)" class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
              <input type="text" id="admin-qa-keys" placeholder="Search Keywords (comma separated)" class="w-full" />
              <button type="submit" class="btn-primary">➕ Save Q&A</button>
            </form>

            <!-- Subtab 3: Add Story -->
            <form id="admin-add-story-form" class="admin-subpanel hidden bg-temple-800 p-4 rounded-xl border border-amber-500/20 space-y-2.5">
              <h3 class="font-bold text-temple-gold text-sm">Add or Update Parayana Day Story</h3>
              <input type="number" id="admin-story-day" min="1" max="108" placeholder="Day Number (e.g., 35 or 42)*" required class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50" />
              <input type="text" id="admin-story-title-en" placeholder="Story Title (English)*" required class="w-full" />
              <textarea id="admin-story-body-en" rows="4" placeholder="Story Content (English)*" required class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
              <input type="text" id="admin-story-title-te" placeholder="Story Title (Telugu - Optional)" class="w-full" />
              <textarea id="admin-story-body-te" rows="3" placeholder="Story Content (Telugu - Optional)" class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
              <input type="text" id="admin-story-title-hi" placeholder="Story Title (Hindi - Optional)" class="w-full" />
              <textarea id="admin-story-body-hi" rows="3" placeholder="Story Content (Hindi - Optional)" class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
              <button type="submit" class="btn-primary">➕ Save Story</button>
            </form>

            <!-- Subtab 4: Add Bhajan -->
            <form id="admin-add-bhajan-form" class="admin-subpanel hidden bg-temple-800 p-4 rounded-xl border border-amber-500/20 space-y-2.5">
              <h3 class="font-bold text-temple-gold text-sm">Add New Bhajan or Stotram</h3>
              <input type="text" id="admin-bhajan-title-en" placeholder="Bhajan Title (English)*" required class="w-full" />
              <textarea id="admin-bhajan-lyrics-en" rows="4" placeholder="Lyrics (English)*" required class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
              <input type="text" id="admin-bhajan-title-te" placeholder="Bhajan Title (Telugu - Optional)" class="w-full" />
              <textarea id="admin-bhajan-lyrics-te" rows="3" placeholder="Lyrics (Telugu - Optional)" class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
              <input type="text" id="admin-bhajan-title-hi" placeholder="Bhajan Title (Hindi - Optional)" class="w-full" />
              <textarea id="admin-bhajan-lyrics-hi" rows="3" placeholder="Lyrics (Hindi - Optional)" class="w-full bg-temple-900 border border-amber-500/30 rounded-lg p-2 text-sm text-amber-50"></textarea>
              <button type="submit" class="btn-primary">➕ Save Bhajan</button>
            </form>

            <!-- Subtab 5: Security & Export -->
            <div id="atab-security" class="admin-subpanel hidden space-y-4">
              <form id="admin-change-pin-form" class="bg-temple-800 p-4 rounded-xl border border-amber-500/20 space-y-2">
                <h3 class="font-bold text-temple-gold text-sm">Change Admin Passcode</h3>
                <div class="flex gap-2">
                  <input type="password" id="admin-new-pin" placeholder="New PIN (min 4 chars)" minlength="4" required class="flex-1 bg-temple-900 text-amber-50 border border-amber-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-temple-gold" />
                  <button type="submit" class="btn-primary">Update PIN</button>
                </div>
              </form>

              <div class="bg-temple-800 p-4 rounded-xl border border-amber-500/20 space-y-2">
                <h3 class="font-bold text-temple-gold text-sm">Export Custom Content Pack (For Hosting)</h3>
                <p class="text-xs text-amber-200/75">Download <code>custom-content.js</code> and place it in <code>data/</code> to publish all your changes permanently.</p>
                <div class="flex flex-wrap gap-2 pt-1">
                  <button type="button" id="admin-export-btn" class="btn-outline">⬇️ Download custom-content.js</button>
                  <button type="button" id="admin-logout-btn" class="btn-ghost-sm">🚪 Logout Admin</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  function init(refreshAppCallback) {
    const avatarContainer = document.getElementById("guru-avatar-container");
    if (avatarContainer) window.DEFAULT_GURU_SVG = avatarContainer.innerHTML;
    if (window.VISUAL_CARDS_DATA && !window.BASE_VISUAL_CARDS) {
      window.BASE_VISUAL_CARDS = [...window.VISUAL_CARDS_DATA];
    }

    if (window.HOSTED_CUSTOM_CONTENT) {
      const existing = getCustomData();
      saveCustomData({
        guruAvatar: existing.guruAvatar || window.HOSTED_CUSTOM_CONTENT.guruAvatar || null,
        cardOverrides: { ...(window.HOSTED_CUSTOM_CONTENT.cardOverrides || {}), ...existing.cardOverrides },
        deletedCardIds: [...new Set([...(window.HOSTED_CUSTOM_CONTENT.deletedCardIds || []), ...existing.deletedCardIds])],
        extraVisualCards: [...(window.HOSTED_CUSTOM_CONTENT.extraVisualCards || []), ...existing.extraVisualCards],
        extraQAs: [...(window.HOSTED_CUSTOM_CONTENT.extraQAs || []), ...existing.extraQAs],
        extraStories: [...(window.HOSTED_CUSTOM_CONTENT.extraStories || []), ...existing.extraStories],
        extraBhajans: [...(window.HOSTED_CUSTOM_CONTENT.extraBhajans || []), ...existing.extraBhajans]
      });
    }

    applyCustomContentToApp();
    injectAdminUI();

    const modal = document.getElementById("admin-modal");
    const loginView = document.getElementById("admin-login-view");
    const dashView = document.getElementById("admin-dashboard-view");

    function openModal() {
      modal.classList.remove("hidden");
      if (isLoggedIn()) {
        loginView.classList.add("hidden");
        dashView.classList.remove("hidden");
        populateCardEditorDropdown();
        fillCardFormForSelection("__new__");
      } else {
        loginView.classList.remove("hidden");
        dashView.classList.add("hidden");
        setTimeout(() => document.getElementById("admin-pin-input").focus(), 50);
      }
    }

    const triggerBtn = document.getElementById("admin-login-trigger");
    if (triggerBtn) triggerBtn.addEventListener("click", openModal);

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        openModal();
      }
    });

    document.getElementById("admin-close-btn").addEventListener("click", () => modal.classList.add("hidden"));

    document.getElementById("admin-login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const entered = document.getElementById("admin-pin-input").value.trim();
      if (entered === getPin()) {
        sessionStorage.setItem(SESSION_KEY, "true");
        document.getElementById("admin-login-error").classList.add("hidden");
        document.getElementById("admin-pin-input").value = "";
        openModal();
      } else {
        document.getElementById("admin-login-error").classList.remove("hidden");
      }
    });

    document.querySelectorAll(".admin-subtab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-atab");
        document.querySelectorAll(".admin-subtab").forEach((b) => {
          b.classList.toggle("bg-temple-saffron", b === btn);
          b.classList.toggle("text-white", b === btn);
          b.classList.toggle("bg-temple-800", b !== btn);
          b.classList.toggle("text-amber-200", b !== btn);
        });
        document.querySelectorAll(".admin-subpanel").forEach((p) => {
          p.classList.toggle("hidden", p.id !== "atab-" + target);
        });
      });
    });

    // Guru Swami Avatar Upload / Reset
    document.getElementById("admin-guru-img-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const dataUrl = await resizeImageFile(file, 420);
      const data = getCustomData();
      data.guruAvatar = dataUrl;
      saveCustomData(data);
      applyCustomContentToApp();
      alert("Swamiye Saranam Ayyappa! Guru Swami image updated.");
    });

    document.getElementById("admin-reset-guru-img").addEventListener("click", () => {
      const data = getCustomData();
      data.guruAvatar = null;
      saveCustomData(data);
      applyCustomContentToApp();
      alert("Restored default storybook Guru Swami illustration.");
    });

    // Card selector change
    document.getElementById("admin-card-select").addEventListener("change", (e) => {
      fillCardFormForSelection(e.target.value);
    });

    // Save / Update Visual Card (Supports both editing existing 4 default cards & adding new 3-language cards)
    document.getElementById("admin-add-card-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const selectedId = document.getElementById("admin-card-select").value;
      const file = document.getElementById("admin-card-img").files[0];
      if (selectedId === "__new__" && !file) {
        alert("Please select an image for the new card.");
        return;
      }

      const imgUrl = file ? await resizeImageFile(file, 520) : null;
      const tEn = document.getElementById("admin-card-title-en").value.trim();
      const tTe = document.getElementById("admin-card-title-te").value.trim() || tEn;
      const tHi = document.getElementById("admin-card-title-hi").value.trim() || tEn;
      const cEn = document.getElementById("admin-card-cap-en").value.trim();
      const cTe = document.getElementById("admin-card-cap-te").value.trim() || cEn;
      const cHi = document.getElementById("admin-card-cap-hi").value.trim() || cEn;
      const isFullPoster = document.getElementById("admin-card-fullposter").checked;

      const data = getCustomData();

      if (selectedId === "__new__") {
        data.extraVisualCards.push({
          id: "custom-card-" + Date.now(),
          qaId: "sig-41",
          isFullPoster,
          imageUrl: imgUrl,
          title: { en: tEn, te: tTe, hi: tHi },
          caption: { en: cEn, te: cTe, hi: cHi }
        });
      } else {
        const existingCard = window.VISUAL_CARDS_DATA.find((c) => c.id === selectedId) || {};
        data.cardOverrides[selectedId] = {
          isFullPoster,
          imageUrl: imgUrl || existingCard.imageUrl || null,
          title: { en: tEn, te: tTe, hi: tHi },
          caption: { en: cEn, te: cTe, hi: cHi }
        };
      }

      saveCustomData(data);
      applyCustomContentToApp();
      populateCardEditorDropdown();
      fillCardFormForSelection("__new__");
      document.getElementById("admin-card-img").value = "";
      refreshAppCallback();
      alert("Visual Explainer Card saved in all languages!");
    });

    // Delete / Hide Card
    document.getElementById("admin-delete-card-btn").addEventListener("click", () => {
      const selectedId = document.getElementById("admin-card-select").value;
      if (selectedId === "__new__") return;
      const data = getCustomData();
      data.deletedCardIds.push(selectedId);
      saveCustomData(data);
      applyCustomContentToApp();
      populateCardEditorDropdown();
      fillCardFormForSelection("__new__");
      refreshAppCallback();
      alert("Card removed from carousel.");
    });

    // Add Q&A
    document.getElementById("admin-add-qa-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const qEn = document.getElementById("admin-qa-q-en").value.trim();
      const aEn = document.getElementById("admin-qa-a-en").value.trim();
      const qTe = document.getElementById("admin-qa-q-te").value.trim() || qEn;
      const aTe = document.getElementById("admin-qa-a-te").value.trim() || aEn;
      const qHi = document.getElementById("admin-qa-q-hi").value.trim() || qEn;
      const aHi = document.getElementById("admin-qa-a-hi").value.trim() || aEn;
      const keys = document.getElementById("admin-qa-keys").value.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);

      const data = getCustomData();
      data.extraQAs.unshift({
        id: "custom-qa-" + Date.now(),
        cat: document.getElementById("admin-qa-cat").value,
        keywords: [...keys, ...qEn.toLowerCase().split(/\s+/)],
        q: { en: qEn, te: qTe, hi: qHi },
        a: { en: aEn, te: aTe, hi: aHi }
      });
      saveCustomData(data);
      applyCustomContentToApp();
      refreshAppCallback();
      e.target.reset();
      alert("New Guru Swami Q&A added!");
    });

    // Add Story
    document.getElementById("admin-add-story-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const dayNum = Number(document.getElementById("admin-story-day").value);
      const tEn = document.getElementById("admin-story-title-en").value.trim();
      const bEn = document.getElementById("admin-story-body-en").value.trim();
      const tTe = document.getElementById("admin-story-title-te").value.trim() || tEn;
      const bTe = document.getElementById("admin-story-body-te").value.trim() || bEn;
      const tHi = document.getElementById("admin-story-title-hi").value.trim() || tEn;
      const bHi = document.getElementById("admin-story-body-hi").value.trim() || bEn;

      const data = getCustomData();
      data.extraStories = data.extraStories.filter((s) => s.day !== dayNum);
      data.extraStories.push({
        day: dayNum,
        guruTopicId: "sig-41",
        title: { en: tEn, te: tTe, hi: tHi },
        content: { en: bEn, te: bTe, hi: bHi }
      });
      saveCustomData(data);
      applyCustomContentToApp();
      refreshAppCallback();
      e.target.reset();
      alert(`Day ${dayNum} Story saved!`);
    });

    // Add Bhajan
    document.getElementById("admin-add-bhajan-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const tEn = document.getElementById("admin-bhajan-title-en").value.trim();
      const lEn = document.getElementById("admin-bhajan-lyrics-en").value.trim();
      const tTe = document.getElementById("admin-bhajan-title-te").value.trim() || tEn;
      const lTe = document.getElementById("admin-bhajan-lyrics-te").value.trim() || lEn;
      const tHi = document.getElementById("admin-bhajan-title-hi").value.trim() || tEn;
      const lHi = document.getElementById("admin-bhajan-lyrics-hi").value.trim() || lEn;

      const data = getCustomData();
      data.extraBhajans.push({
        id: "custom-bhajan-" + Date.now(),
        title: { en: tEn, te: tTe, hi: tHi },
        lyrics: { en: lEn, te: lTe, hi: lHi }
      });
      saveCustomData(data);
      applyCustomContentToApp();
      refreshAppCallback();
      e.target.reset();
      alert("New Bhajan added!");
    });

    // Change PIN
    document.getElementById("admin-change-pin-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const newPin = document.getElementById("admin-new-pin").value.trim();
      if (newPin.length >= 4) {
        localStorage.setItem(PIN_KEY, newPin);
        e.target.reset();
        alert("Admin PIN updated successfully!");
      }
    });

    // Export custom-content.js
    document.getElementById("admin-export-btn").addEventListener("click", () => {
      const data = getCustomData();
      const fileContent = "window.HOSTED_CUSTOM_CONTENT = " + JSON.stringify(data, null, 2) + ";\n";
      const blob = new Blob([fileContent], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "custom-content.js";
      a.click();
      URL.revokeObjectURL(url);
    });

    // Logout
    document.getElementById("admin-logout-btn").addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_KEY);
      modal.classList.add("hidden");
    });
  }

  return { init, applyCustomContentToApp };
})();