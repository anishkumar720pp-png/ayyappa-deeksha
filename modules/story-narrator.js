window.StoryNarratorModule = (function () {
  const synth = window.speechSynthesis;
  let allVoices = [];
  let isSpeaking = false;
  let isPaused = false;
  let activeSource = null;
  let queue = [];
  let queueIdx = 0;
  let keepAliveTimer = null;
  let activeAudio = null;

  const LANG_MAP = { en: "en", te: "te", hi: "hi" };
  const BCP47_MAP = { en: "en-IN", te: "te-IN", hi: "hi-IN" };

  function loadVoices() {
    if (!synth) return;
    allVoices = synth.getVoices() || [];
    populateVoiceDropdown();
  }

  function getActiveLang() {
    return localStorage.getItem("ayyappa_lang") || "en";
  }

  function getMatchingVoices(langPrefix) {
    return allVoices.filter((v) =>
      v.lang.toLowerCase().replace("_", "-").startsWith(langPrefix)
    );
  }

  function populateVoiceDropdown() {
    const sel = document.getElementById("narrator-voice-select");
    if (!sel) return;
    const langPrefix = LANG_MAP[getActiveLang()] || "en";
    const matching = getMatchingVoices(langPrefix);

    if (matching.length > 0) {
      const savedVoice = localStorage.getItem("ayyappa_voice_" + langPrefix) || "";
      sel.innerHTML = matching.map((v) => {
        const selected = v.name === savedVoice ? "selected" : "";
        const cleanName = v.name.replace(/Microsoft |Google |Android |Online \(Natural\) - /g, "");
        return `<option value="${v.name}" ${selected}>🎙️ ${cleanName}</option>`;
      }).join("");
    } else {
      sel.innerHTML = `<option value="">🎙️ Peetam Voice (${BCP47_MAP[langPrefix]})</option>`;
    }
  }

  function updateButtons() {
    const playBtn = document.getElementById("narrator-play-btn");
    const stopBtn = document.getElementById("narrator-stop-btn");
    const guruStopBtn = document.getElementById("stop-answer-btn");

    if (playBtn && stopBtn) {
      if (isSpeaking && activeSource === "story" && !isPaused) {
        playBtn.textContent = "⏸️ Pause";
        stopBtn.classList.remove("hidden");
      } else if (isSpeaking && activeSource === "story" && isPaused) {
        playBtn.textContent = "▶️ Resume";
        stopBtn.classList.remove("hidden");
      } else {
        playBtn.textContent = "🔊 Listen";
        stopBtn.classList.add("hidden");
      }
    }

    if (guruStopBtn) {
      guruStopBtn.classList.toggle("hidden", !(isSpeaking && activeSource === "guru"));
    }
  }

  function clearKeepAlive() {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }

  function stop() {
    clearKeepAlive();
    if (synth) synth.cancel();
    if (activeAudio) {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
      activeAudio = null;
    }
    isSpeaking = false;
    isPaused = false;
    activeSource = null;
    queue = [];
    queueIdx = 0;
    updateButtons();
  }

  function normalizeTextForLang(text, langPrefix) {
    let t = text
      .replace(/[•▪◆►'‘’"“”()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (langPrefix === "te") {
      t = t
        .replace(/\b41\b/g, "నలభై ఒకటి")
        .replace(/\b18\b/g, "పద్దెనిమిది")
        .replace(/\b108\b/g, "నూట ఎనిమిది");
    } else if (langPrefix === "hi") {
      t = t
        .replace(/\b41\b/g, "इकतालीस")
        .replace(/\b18\b/g, "अठारह")
        .replace(/\b108\b/g, "एक सौ आठ");
    }
    return t;
  }

  function buildSentenceChunks(rawText, langPrefix) {
    const cleaned = normalizeTextForLang(rawText, langPrefix);
    const rawSentences = cleaned.split(/(?<=[.!?।])\s+|\n+/);
    const chunks = [];
    for (const s of rawSentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      if (trimmed.length <= 140) {
        chunks.push(trimmed);
      } else {
        const subParts = trimmed.match(/.{1,130}(?:\s|,|$)/g) || [trimmed];
        subParts.forEach((p) => { if (p.trim()) chunks.push(p.trim()); });
      }
    }
    return chunks;
  }

  function speakNextChunk() {
    if (!isSpeaking || queueIdx >= queue.length) {
      stop();
      return;
    }

    const langPrefix = LANG_MAP[getActiveLang()] || "en";
    if (synth && allVoices.length === 0) allVoices = synth.getVoices() || [];
    const matching = getMatchingVoices(langPrefix);

    const utter = new SpeechSynthesisUtterance(queue[queueIdx]);
    utter.lang = BCP47_MAP[langPrefix] || "en-IN";

    const sel = document.getElementById("narrator-voice-select");
    if (matching.length > 0) {
      const chosen = matching.find((v) => v.name === (sel && sel.value)) || matching[0];
      if (chosen) utter.voice = chosen;
    }

    const rateSel = document.getElementById("narrator-rate-select");
    utter.rate = rateSel ? parseFloat(rateSel.value) || 0.95 : 0.95;

    utter.onend = () => {
      queueIdx += 1;
      setTimeout(speakNextChunk, 50);
    };
    utter.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      queueIdx += 1;
      setTimeout(speakNextChunk, 50);
    };

    synth.speak(utter);
  }

  // Checks if a pre-recorded MP3 exists in audio/<lang>/<slug>.mp3 before falling back to TTS
  function tryPlayBundledMp3(mp3Path, fallbackText, source) {
    stop();
    isSpeaking = true;
    isPaused = false;
    activeSource = source;
    updateButtons();

    const audio = new Audio(mp3Path);
    const rateSel = document.getElementById("narrator-rate-select");
    audio.playbackRate = rateSel ? parseFloat(rateSel.value) || 0.95 : 0.95;

    audio.oncanplaythrough = () => {
      if (!isSpeaking) return;
      activeAudio = audio;
      audio.play().catch(() => startTtsFallback(fallbackText, source));
    };
    audio.onended = () => stop();
    audio.onerror = () => startTtsFallback(fallbackText, source);
    audio.load();
  }

  function startTtsFallback(fullText, source) {
    if (!synth) {
      stop();
      return;
    }
    const langPrefix = LANG_MAP[getActiveLang()] || "en";
    queue = buildSentenceChunks(fullText, langPrefix);
    if (queue.length === 0) {
      stop();
      return;
    }
    queueIdx = 0;
    keepAliveTimer = setInterval(() => {
      if (synth && synth.speaking && !synth.paused) synth.resume();
    }, 10000);
    speakNextChunk();
  }

  function toggleStoryNarration() {
    if (isSpeaking && activeSource === "story" && !isPaused) {
      if (activeAudio && !activeAudio.paused) activeAudio.pause();
      else if (synth) synth.pause();
      isPaused = true;
      updateButtons();
      return;
    }
    if (isSpeaking && activeSource === "story" && isPaused) {
      isPaused = false;
      updateButtons();
      if (activeAudio) activeAudio.play();
      else if (synth) synth.resume();
      return;
    }
    const langPrefix = LANG_MAP[getActiveLang()] || "en";
    const dayBadge = document.getElementById("story-day-badge")?.textContent || "";
    const dayNum = (dayBadge.match(/\d+/) || ["1"])[0];
    const title = document.getElementById("story-title")?.textContent || "";
    const body = document.getElementById("story-content")?.textContent || "";

    // Looks for audio/te/day-1.mp3, audio/hi/day-1.mp3, audio/en/day-1.mp3 first!
    tryPlayBundledMp3(`audio/${langPrefix}/day-${dayNum}.mp3`, `${title}. ${body}`, "story");
  }

  function speakGuruAnswer() {
    const q = document.getElementById("guru-answer-q")?.textContent || "";
    const a = document.getElementById("guru-answer-a")?.textContent || "";
    stop();
    isSpeaking = true;
    isPaused = false;
    activeSource = "guru";
    updateButtons();
    startTtsFallback(`${q}. ${a}`, "guru");
  }

  function init() {
    if (synth) {
      loadVoices();
      if (typeof synth.onvoiceschanged !== "undefined") {
        synth.onvoiceschanged = loadVoices;
      }
    }

    const playBtn = document.getElementById("narrator-play-btn");
    const stopBtn = document.getElementById("narrator-stop-btn");
    const voiceSel = document.getElementById("narrator-voice-select");
    const guruListenBtn = document.getElementById("listen-answer-btn");
    const guruStopBtn = document.getElementById("stop-answer-btn");

    if (playBtn) playBtn.addEventListener("click", toggleStoryNarration);
    if (stopBtn) stopBtn.addEventListener("click", stop);
    if (guruListenBtn) guruListenBtn.addEventListener("click", speakGuruAnswer);
    if (guruStopBtn) guruStopBtn.addEventListener("click", stop);

    if (voiceSel) {
      voiceSel.addEventListener("change", () => {
        const langPrefix = LANG_MAP[getActiveLang()] || "en";
        localStorage.setItem("ayyappa_voice_" + langPrefix, voiceSel.value);
        if (isSpeaking && activeSource === "story") toggleStoryNarration();
      });
    }
  }

  return { init, stop, populateVoiceDropdown };
})();