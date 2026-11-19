(function () {
  let currentLang = localStorage.getItem("ayyappa_lang") || "en";
  let currentCat = "all";
  let selectedQaId = "sig-41";
  let currentParchmentIdx = 0;
  let currentStoryDay = parseInt(localStorage.getItem("ayyappa_story_day") || "1", 10);
  let storyFontSize = 1.05;

  function getLang() {
    return currentLang;
  }

  function t(key) {
    return (window.UI_STRINGS && window.UI_STRINGS[currentLang] && window.UI_STRINGS[currentLang][key]) ||
           (window.UI_STRINGS && window.UI_STRINGS.en && window.UI_STRINGS.en[key]) || "";
  }

  function applyTranslations() {
    document.getElementById("ui-app-title").textContent = t("appTitle");
    document.getElementById("ui-app-subtitle").textContent = t("appSubtitle");
    document.getElementById("nav-guru").textContent = t("navGuru");
    document.getElementById("nav-stories").textContent = t("navStories");
    document.getElementById("nav-irumudi").textContent = t("navIrumudi");
    document.getElementById("nav-tracker").textContent = t("navTracker");
    document.getElementById("nav-japa").textContent = t("navJapa");
    document.getElementById("nav-selfie").textContent = t("navSelfie");
    document.getElementById("nav-yatra").textContent = t("navYatra");

    document.getElementById("ui-guru-name").textContent = t("guruName");
    document.getElementById("ui-guru-role").textContent = t("guruRole");
    document.getElementById("ui-guru-blessing").textContent = t("guruBlessing");
    document.getElementById("guru-search-input").placeholder = t("askPlaceholder");
    document.getElementById("guru-ask-btn").textContent = t("askBtn");
    document.getElementById("ui-suggested-title").textContent = t("suggestedTitle");

    document.getElementById("ui-stories-title").textContent = t("storiesTitle");
    document.getElementById("ui-stories-sub").textContent = t("storiesSub");
    document.getElementById("jump-today-story").textContent = t("jumpToday");
    document.getElementById("story-prev-btn").textContent = t("prevDay");
    document.getElementById("story-next-btn").textContent = t("nextDay");
    document.getElementById("ask-guru-story-btn").textContent = t("askGuruStory");

    document.getElementById("ui-irumudi-title").textContent = t("irumudiTitle");
    document.getElementById("ui-irumudi-sub").textContent = t("irumudiSub");

    document.getElementById("ui-calc-title").textContent = t("calcTitle");
    document.getElementById("ui-calc-sub").textContent = t("calcSub");
    document.getElementById("ui-start-label").textContent = t("startLabel");
    document.getElementById("ui-kanni-label").textContent = t("kanniLabel");
    document.getElementById("ui-pooja-title").textContent = t("poojaTitle");
    document.getElementById("ui-pooja-sub").textContent = t("poojaSub");

    document.getElementById("ui-japa-title").textContent = t("japaTitle");
    document.getElementById("ui-japa-sub").textContent = t("japaSub");
    document.getElementById("ui-tap-chant").textContent = t("tapChant");

    document.getElementById("ui-selfie-title").textContent = t("selfieTitle");
    document.getElementById("ui-selfie-sub").textContent = t("selfieSub");
    document.getElementById("ui-take-selfie").textContent = t("takeSelfie");

    document.getElementById("ui-yatra-title").textContent = t("yatraTitle");
    document.getElementById("ui-bhajan-title").textContent = t("bhajanTitle");

    renderParchmentCard();
    renderGuruCategories();
    renderGuruAnswer(selectedQaId);
    renderGuruQuestionsList();
    renderStoryControls();
    renderStory(currentStoryDay);
    renderIrumudi();
    renderTracker();
    renderYatraAndBhajans();
    if (window.SaranamJapaModule) window.SaranamJapaModule.render(currentLang);
    if (window.SelfieAlbumModule) window.SelfieAlbumModule.renderGrid(currentLang);
    if (window.StoryNarratorModule) {
      window.StoryNarratorModule.stop();
      window.StoryNarratorModule.populateVoiceDropdown();
    }
  }

  // Sandalwood Parchment Visual Cards
  function renderParchmentCard() {
    const stage = document.getElementById("parchment-card-stage");
    const counter = document.getElementById("pcard-counter");
    if (!stage || !window.VISUAL_CARDS_DATA) return;
    const cards = window.VISUAL_CARDS_DATA;
    const card = cards[currentParchmentIdx % cards.length];
    counter.textContent = `${(currentParchmentIdx % cards.length) + 1} / ${cards.length}`;
    const tapHint = currentLang === "te" ? "వివరాల కోసం నొక్కండి →" : currentLang === "hi" ? "विस्तार से जानने के लिए टैप करें →" : "Tap card to ask Guru Swami in detail →";

    if (card.isFullPoster && card.imageUrl) {
      stage.innerHTML = `
        <img src="${card.imageUrl}" alt="${card.title[currentLang] || card.title.en}" class="w-full max-h-96 object-contain mx-auto rounded-xl" />
        <span class="parchment-tap-hint">${tapHint}</span>
      `;
    } else {
      const mediaHtml = card.imageUrl
        ? `<img src="${card.imageUrl}" alt="${card.title[currentLang] || card.title.en}" class="max-h-48 mx-auto my-2 rounded-xl object-contain" />`
        : (card.svg || "");
      stage.innerHTML = `
        <h3>${card.title[currentLang] || card.title.en}</h3>
        ${mediaHtml}
        <p>${card.caption[currentLang] || card.caption.en}</p>
        <span class="parchment-tap-hint">${tapHint}</span>
      `;
    }

    stage.onclick = () => {
      selectedQaId = card.qaId || "sig-41";
      renderGuruAnswer(selectedQaId);
      renderGuruQuestionsList();
      document.getElementById("guru-answer-box").scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
  }

  // Guru Swami Categories & Q&A Engine
  function renderGuruCategories() {
    const wrap = document.getElementById("guru-category-chips");
    if (!wrap || !window.GURU_CATEGORIES) return;
    wrap.innerHTML = window.GURU_CATEGORIES.map((c) => `
      <button type="button" class="cat-chip ${c.id === currentCat ? "active" : ""}" data-cat="${c.id}">
        ${c[currentLang] || c.en}
      </button>
    `).join("");

    wrap.querySelectorAll(".cat-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentCat = btn.getAttribute("data-cat");
        renderGuruCategories();
        renderGuruQuestionsList(document.getElementById("guru-search-input").value);
      });
    });
  }

  function renderGuruAnswer(qaId) {
    if (!window.GURU_QA_DATA || !window.GURU_QA_DATA.length) return;
    const item = window.GURU_QA_DATA.find((x) => x.id === qaId) || window.GURU_QA_DATA[0];
    selectedQaId = item.id;
    document.getElementById("guru-answer-q").textContent = item.q[currentLang] || item.q.en;
    document.getElementById("guru-answer-a").textContent = item.a[currentLang] || item.a.en;
  }

  function scoreQaMatch(item, queryWords) {
    if (!queryWords.length) return 1;
    const haystack = [
      item.q.en, item.q.te, item.q.hi,
      item.a.en, item.a.te, item.a.hi,
      ...(item.keywords || [])
    ].join(" ").toLowerCase();

    let score = 0;
    for (const w of queryWords) {
      if (haystack.includes(w)) {
        score += 2;
        if ((item.keywords || []).some((k) => k.toLowerCase().includes(w))) score += 3;
        if ((item.q[currentLang] || item.q.en).toLowerCase().includes(w)) score += 3;
      }
    }
    return score;
  }

  function extractMeaningfulWords(raw) {
    const stopWords = new Set(["what", "we", "should", "can", "i", "is", "the", "a", "an", "to", "in", "for", "of", "on", "are", "how", "do", "does", "during", "ayyappa", "deeksha", "swami"]);
    return raw
      .toLowerCase()
      .replace(/[?!.,'"]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stopWords.has(w));
  }

  function renderGuruQuestionsList(filterQuery = "") {
    const grid = document.getElementById("guru-questions-grid");
    if (!grid || !window.GURU_QA_DATA) return;
    const words = extractMeaningfulWords(filterQuery);

    const scored = window.GURU_QA_DATA
      .filter((item) => currentCat === "all" || item.cat === currentCat)
      .map((item) => ({ item, score: scoreQaMatch(item, words) }))
      .filter((entry) => words.length === 0 || entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const listToShow = scored.length > 0 ? scored.map((s) => s.item) : window.GURU_QA_DATA;

    grid.innerHTML = listToShow.map((item) => `
      <button type="button" class="q-card-btn ${item.id === selectedQaId ? "selected" : ""}" data-id="${item.id}">
        🙏 ${item.q[currentLang] || item.q.en}
      </button>
    `).join("");

    grid.querySelectorAll(".q-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        renderGuruAnswer(btn.getAttribute("data-id"));
        renderGuruQuestionsList(filterQuery);
        document.getElementById("guru-answer-box").scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  function handleAskSubmit(scrollToAnswer = false) {
    const inputEl = document.getElementById("guru-search-input");
    const rawVal = inputEl.value.trim();
    const words = extractMeaningfulWords(rawVal);

    // Reset category to All when user asks a custom question so nothing is hidden
    if (rawVal && currentCat !== "all") {
      currentCat = "all";
      renderGuruCategories();
    }

    renderGuruQuestionsList(rawVal);

    if (!rawVal) return;

    const ranked = window.GURU_QA_DATA
      .map((item) => ({ item, score: scoreQaMatch(item, words) }))
      .sort((a, b) => b.score - a.score);

    if (ranked.length && ranked[0].score > 0) {
      renderGuruAnswer(ranked[0].item.id);
      renderGuruQuestionsList(rawVal);
    } else {
      // Compassionate Guru Swami fallback answer for any unique question
      document.getElementById("guru-answer-q").textContent = rawVal;
      document.getElementById("guru-answer-a").textContent =
        currentLang === "te"
          ? "స్వామియే శరణమయ్యప్ప! మీ ప్రశ్నకు గురుస్వామి సూచన: 41 రోజుల దీక్షలో సత్యం, శాకాహారం, బ్రహ్మచర్యం, మరియు ప్రతి జీవిలో స్వామిని దర్శించడం ప్రధానం. ప్రత్యేక సందేహాల కోసం మీ పీఠం గురుస్వామి సలహాను పాటించండి."
          : currentLang === "hi"
          ? "स्वामीये शरणम अय्यप्पा! गुरु स्वामी का मार्गदर्शन: 41 दिनों की दीक्षा में सात्विक आहार, ब्रह्मचर्य, सत्य और प्रत्येक प्राणी में स्वामी का दर्शन ही मूल नियम है। विशेष शंका के लिए अपने पीठम के गुरु स्वामी से परामर्श लें।"
          : "Swamiye Saranam Ayyappa! Guru Swami's Guidance: During the 41-day Mandala Deeksha, any action that preserves purity of body, Sattvic diet, truthfulness, Brahmacharya, and seeing Lord Ayyappa in every living being is aligned with Dharma. For specific personal situations, consult your Peetam Guru Swami with devotion.";
    }

    if (scrollToAnswer) {
      document.getElementById("guru-answer-box").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // 41-Day Parayana Stories
  function getReadDays() {
    try { return JSON.parse(localStorage.getItem("ayyappa_read_days") || "[]"); }
    catch (e) { return []; }
  }

  function renderStoryControls() {
    const select = document.getElementById("story-day-select");
    const strip = document.getElementById("story-day-strip");
    if (!select || !strip || !window.PARAYANA_STORIES) return;
    const readDays = getReadDays();
    const dayWord = currentLang === "te" ? "రోజు" : currentLang === "hi" ? "दिन" : "Day";

    select.innerHTML = window.PARAYANA_STORIES.map((s) =>
      `<option value="${s.day}" ${s.day === currentStoryDay ? "selected" : ""}>${dayWord} ${s.day}</option>`
    ).join("");

    strip.innerHTML = window.PARAYANA_STORIES.map((s) => {
      const isRead = readDays.includes(s.day);
      const isActive = s.day === currentStoryDay;
      return `<button type="button" class="day-pill ${isRead ? "read" : ""} ${isActive ? "active" : ""}" data-day="${s.day}">${s.day}</button>`;
    }).join("");

    strip.querySelectorAll(".day-pill").forEach((btn) => {
      btn.addEventListener("click", () => renderStory(Number(btn.getAttribute("data-day"))));
    });
  }

  function renderStory(dayNum) {
    if (window.StoryNarratorModule) window.StoryNarratorModule.stop();
    if (!window.PARAYANA_STORIES) return;
    const story = window.PARAYANA_STORIES.find((s) => s.day === dayNum) || window.PARAYANA_STORIES[0];
    currentStoryDay = story.day;
    localStorage.setItem("ayyappa_story_day", String(currentStoryDay));

    const dayWord = currentLang === "te" ? "రోజు పారాయణం" : currentLang === "hi" ? "दिन का पारायण" : "Day Parayana";
    document.getElementById("story-day-badge").textContent = `${story.day} — ${dayWord}`;
    document.getElementById("story-title").textContent = story.title[currentLang] || story.title.en;
    const contentEl = document.getElementById("story-content");
    contentEl.textContent = story.content[currentLang] || story.content.en;
    contentEl.style.fontSize = `${storyFontSize}rem`;

    const readDays = getReadDays();
    const markBtn = document.getElementById("story-mark-read");
    markBtn.textContent = readDays.includes(story.day) ? t("markedRead") : t("markRead");

    renderStoryControls();
  }

  // Irumudi Packing Guide
  function getPackedItems() {
    try { return JSON.parse(localStorage.getItem("ayyappa_irumudi_packed") || "[]"); }
    catch (e) { return []; }
  }

  function renderIrumudi() {
    if (!window.IRUMUDI_ITEMS) return;
    const packed = getPackedItems();
    const munGrid = document.getElementById("munmudi-grid");
    const pinGrid = document.getElementById("pinmudi-grid");

    const buildCard = (item) => {
      const isPacked = packed.includes(item.id);
      return `
        <div class="irumudi-item-card ${isPacked ? "packed" : ""}" data-id="${item.id}">
          <span class="pack-check">${isPacked ? "✅" : "⬜"}</span>
          ${item.svg}
          <h4>${item.name[currentLang] || item.name.en}</h4>
          <p>${item.desc[currentLang] || item.desc.en}</p>
        </div>
      `;
    };

    munGrid.innerHTML = window.IRUMUDI_ITEMS.filter((i) => i.compartment === "munmudi").map(buildCard).join("");
    pinGrid.innerHTML = window.IRUMUDI_ITEMS.filter((i) => i.compartment === "pinmudi").map(buildCard).join("");

    const packWord = currentLang === "te" ? "ప్యాక్ అయ్యాయి" : currentLang === "hi" ? "पैक हो गए" : "Packed";
    document.getElementById("irumudi-progress-text").textContent = `${packed.length} / ${window.IRUMUDI_ITEMS.length} ${packWord}`;

    document.querySelectorAll(".irumudi-item-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        let list = getPackedItems();
        list = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
        localStorage.setItem("ayyappa_irumudi_packed", JSON.stringify(list));
        renderIrumudi();
      });
    });
  }

  // Mandala Calculator & Daily Checklist
  function calculateMandalaDay() {
    const startVal = localStorage.getItem("ayyappa_start_date");
    if (!startVal) return null;
    const start = new Date(startVal + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    const end = new Date(start);
    end.setDate(start.getDate() + 40);
    return { dayNum: diff, start, end };
  }

  function renderTracker() {
    const dateInput = document.getElementById("deeksha-start-date");
    const savedDate = localStorage.getItem("ayyappa_start_date") || "";
    dateInput.value = savedDate;

    const summaryBox = document.getElementById("mandala-summary");
    const info = calculateMandalaDay();
    if (!info) {
      summaryBox.innerHTML = currentLang === "te"
        ? "మీ మాలధారణ తేదీని ఎంచుకుంటే 41 రోజుల మండల పూర్తి తేదీ మరియు నేటి దీక్షా రోజు కనిపిస్తాయి."
        : currentLang === "hi"
        ? "अपनी माला धारण तिथि चुनें ताकि 41वें दिन की समाप्ति तिथि और आज का दीक्षा दिवस दिख सके।"
        : "Select your Mala Dharana date above to see your 41st-day Mandala completion date and current Deeksha day.";
    } else {
      const clampedDay = Math.max(1, Math.min(41, info.dayNum));
      summaryBox.innerHTML = `
        <strong>🙏 Mandala Day ${info.dayNum > 0 ? info.dayNum : "Upcoming"} of 41</strong><br/>
        <span style="font-size:0.86rem;color:#c9b9a6;">
          Start: ${info.start.toDateString()} • 41st Day Completion: <strong>${info.end.toDateString()}</strong>
        </span>
      `;
      const selfieSel = document.getElementById("selfie-day-select");
      if (selfieSel) selfieSel.value = String(clampedDay);
    }

    const kanniToggle = document.getElementById("kanni-swami-toggle");
    const kanniSaved = localStorage.getItem("ayyappa_kanni") === "true";
    kanniToggle.checked = kanniSaved;
    const kanniBox = document.getElementById("kanni-tips-box");
    kanniBox.textContent = t("kanniTips");
    kanniBox.classList.toggle("hidden", !kanniSaved);

    const todayKey = "ayyappa_chk_" + new Date().toISOString().slice(0, 10);
    let checked = [];
    try { checked = JSON.parse(localStorage.getItem(todayKey) || "[]"); } catch (e) {}

    const listWrap = document.getElementById("daily-checklist");
    const items = t("checklistItems") || [];
    listWrap.innerHTML = items.map((label, idx) => {
      const done = checked.includes(idx);
      return `
        <label class="check-item ${done ? "done" : ""}">
          <input type="checkbox" data-idx="${idx}" ${done ? "checked" : ""} />
          <span>${label}</span>
        </label>
      `;
    }).join("");

    listWrap.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.addEventListener("change", () => {
        const idx = Number(cb.getAttribute("data-idx"));
        let cur = [];
        try { cur = JSON.parse(localStorage.getItem(todayKey) || "[]"); } catch (e) {}
        cur = cb.checked ? [...new Set([...cur, idx])] : cur.filter((x) => x !== idx);
        localStorage.setItem(todayKey, JSON.stringify(cur));
        renderTracker();
      });
    });
  }

  // Yatra Stops & Bhajans
  function renderYatraAndBhajans() {
    const yatraWrap = document.getElementById("yatra-stops-list");
    if (yatraWrap && window.YATRA_STOPS) {
      yatraWrap.innerHTML = window.YATRA_STOPS.map((st) => `
        <div class="yatra-stop">
          <h4>${st.step}. ${st.name[currentLang] || st.name.en}</h4>
          <p>${st.desc[currentLang] || st.desc.en}</p>
        </div>
      `).join("");
    }

    const bhajanWrap = document.getElementById("bhajans-list");
    if (bhajanWrap && window.BHAJANS_DATA) {
      bhajanWrap.innerHTML = window.BHAJANS_DATA.map((b, i) => `
        <div class="bhajan-item ${i === 0 ? "open" : ""}">
          <button type="button" class="bhajan-header">${b.title[currentLang] || b.title.en} <span>▼</span></button>
          <div class="bhajan-body">${b.lyrics[currentLang] || b.lyrics.en}</div>
        </div>
      `).join("");

      bhajanWrap.querySelectorAll(".bhajan-header").forEach((btn) => {
        btn.addEventListener("click", () => {
          btn.parentElement.classList.toggle("open");
        });
      });
    }
  }

  function shareText(title, body) {
    const full = `🙏 Swamiye Saranam Ayyappa 🙏

${title}

${body}`;
    if (navigator.share) {
      navigator.share({ title, text: full }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(full);
      alert("Copied sacred text to clipboard!");
    }
  }

  function switchTab(tabId) {
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.toggle("active", b.getAttribute("data-tab") === tabId));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + tabId));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === currentLang);
      btn.addEventListener("click", () => {
        currentLang = btn.getAttribute("data-lang");
        localStorage.setItem("ayyappa_lang", currentLang);
        document.querySelectorAll(".lang-btn").forEach((b) => b.classList.toggle("active", b === btn));
        applyTranslations();
      });
    });

    document.getElementById("pcard-prev").addEventListener("click", () => {
      const len = window.VISUAL_CARDS_DATA.length;
      currentParchmentIdx = (currentParchmentIdx - 1 + len) % len;
      renderParchmentCard();
    });
    document.getElementById("pcard-next").addEventListener("click", () => {
      const len = window.VISUAL_CARDS_DATA.length;
      currentParchmentIdx = (currentParchmentIdx + 1) % len;
      renderParchmentCard();
    });

    // Form submit (handles both Enter key and Ask button click!)
    const askForm = document.getElementById("guru-ask-form");
    if (askForm) {
      askForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleAskSubmit(true);
      });
    }
    document.getElementById("guru-search-input").addEventListener("input", () => handleAskSubmit(false));

    document.getElementById("share-answer-btn").addEventListener("click", () => {
      shareText(
        document.getElementById("guru-answer-q").textContent,
        document.getElementById("guru-answer-a").textContent
      );
    });

    document.getElementById("story-day-select").addEventListener("change", (e) => renderStory(Number(e.target.value)));
    document.getElementById("story-prev-btn").addEventListener("click", () => {
      if (currentStoryDay > 1) renderStory(currentStoryDay - 1);
    });
    document.getElementById("story-next-btn").addEventListener("click", () => {
      if (currentStoryDay < 41) renderStory(currentStoryDay + 1);
    });
    document.getElementById("story-font-inc").addEventListener("click", () => {
      storyFontSize = Math.min(1.45, storyFontSize + 0.08);
      document.getElementById("story-content").style.fontSize = `${storyFontSize}rem`;
    });
    document.getElementById("story-font-dec").addEventListener("click", () => {
      storyFontSize = Math.max(0.85, storyFontSize - 0.08);
      document.getElementById("story-content").style.fontSize = `${storyFontSize}rem`;
    });
    document.getElementById("story-mark-read").addEventListener("click", () => {
      let read = getReadDays();
      read = read.includes(currentStoryDay) ? read.filter((d) => d !== currentStoryDay) : [...read, currentStoryDay];
      localStorage.setItem("ayyappa_read_days", JSON.stringify(read));
      renderStory(currentStoryDay);
    });
    document.getElementById("jump-today-story").addEventListener("click", () => {
      const info = calculateMandalaDay();
      if (info && info.dayNum >= 1 && info.dayNum <= 41) {
        renderStory(info.dayNum);
      } else {
        switchTab("tracker");
      }
    });
    document.getElementById("ask-guru-story-btn").addEventListener("click", () => {
      const story = window.PARAYANA_STORIES.find((s) => s.day === currentStoryDay);
      if (story && story.guruTopicId) selectedQaId = story.guruTopicId;
      switchTab("guru");
      renderGuruAnswer(selectedQaId);
      renderGuruQuestionsList();
    });
    document.getElementById("story-share-btn").addEventListener("click", () => {
      shareText(
        document.getElementById("story-title").textContent,
        document.getElementById("story-content").textContent
      );
    });

    document.getElementById("irumudi-reset-btn").addEventListener("click", () => {
      localStorage.removeItem("ayyappa_irumudi_packed");
      renderIrumudi();
    });

    document.getElementById("deeksha-start-date").addEventListener("change", (e) => {
      localStorage.setItem("ayyappa_start_date", e.target.value);
      renderTracker();
    });
    document.getElementById("kanni-swami-toggle").addEventListener("change", (e) => {
      localStorage.setItem("ayyappa_kanni", String(e.target.checked));
      renderTracker();
    });

    if (window.SaranamJapaModule) window.SaranamJapaModule.init(getLang);
    if (window.SelfieAlbumModule) window.SelfieAlbumModule.init(getLang);
    if (window.AdminPanelModule) window.AdminPanelModule.init(applyTranslations);
    if (window.StoryNarratorModule) window.StoryNarratorModule.init();
    if (window.DarshanIntroModule) window.DarshanIntroModule.init();

    applyTranslations();

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  });
})();
