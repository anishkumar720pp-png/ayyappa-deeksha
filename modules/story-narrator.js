window.StoryNarratorModule = (function () {
  const synth = window.speechSynthesis;
  const VOICE_READY_KEY = "ayyappa_offline_voices_ready_v2";

  const PIPER_VOICE_IDS = {
    te: "te_IN-maya-medium",
    hi: "hi_IN-pratham-medium",
    en: "en_US-lessac-medium"
  };

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

  function isFileProtocol() {
    return window.location.protocol === "file:";
  }

  async function downloadOfflineVoicePack(onProgress) {
    if (isFileProtocol() || !window.PiperTTS) {
      if (onProgress) {
        onProgress(100, "⚠️ Open your live GitHub Pages link (https://...) to download Offline Neural Voices.");
      }
      return;
    }
    try {
      const langs = [
        { code: "te", label: "Telugu (తెలుగు - Maya)" },
        { code: "hi", label: "Hindi (हिन्दी - Pratham)" },
        { code: "en", label: "English (Lessac)" }
      ];
      for (let i = 0; i < langs.length; i++) {
        const item = langs[i];
        const voiceId = PIPER_VOICE_IDS[item.code];
        const basePct = Math.round((i / langs.length) * 100);
        if (onProgress) onProgress(basePct + 5, `Downloading ${item.label}...`);

        await window.PiperTTS.download(voiceId, (progress) => {
          if (progress && progress.total && onProgress) {
            const sub = Math.round((progress.loaded / progress.total) * (100 / langs.length));
            onProgress(
              Math.min(99, basePct + sub),
              `Downloading ${item.label}: ${Math.round((progress.loaded / progress.total) * 100)}%`
            );
          }
        });
      }
      localStorage.setItem(VOICE_READY_KEY, "true");
      if (onProgress) onProgress(100, "✅ All 3 Neural Voices (Telugu • Hindi • English) Ready!");
      populateVoiceDropdown();
    } catch (err) {
      console.error("Neural voice download error:", err);
      if (onProgress) onProgress(100, "⚠️ Download interrupted—check internet and try again.");
    }
  }

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

    let optionsHtml = "";
    if (!isFileProtocol()) {
      optionsHtml += `<option value="__neural__">🕉️ Peetam Neural Voice (${langPrefix.toUpperCase()})</option>`;
    }
    if (matching.length > 0) {
      optionsHtml += matching.map((v) => {
        const cleanName = v.name.replace(/Microsoft |Google |Android |Online \(Natural\) - /g, "");
        return `<option value="${v.name}">🎙️ ${cleanName}</option>`;
      }).join("");
    } else if (!optionsHtml) {
      optionsHtml += `<option value="">🎙️ System (${BCP47_MAP[langPrefix]})</option>`;
    }
    sel.innerHTML = optionsHtml;
  }

  function updateButtons(loadingText) {
    const playBtn = document.getElementById("narrator-play-btn");
    const stopBtn = document.getElementById("narrator-stop-btn");
    const guruListenBtn = document.getElementById("listen-answer-btn");
    const guruStopBtn = document.getElementById("stop-answer-btn");

    if (playBtn && stopBtn) {
      if (loadingText && activeSource === "story") {
        playBtn.textContent = loadingText;
        stopBtn.classList.remove("hidden");
      } else if (isSpeaking && activeSource === "story" && !isPaused) {
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

    if (guruListenBtn) {
      guruListenBtn.textContent = loadingText && activeSource === "guru" ? loadingText : "🔊 Listen";
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

  // Prevents Telugu/Hindi TTS engines from stalling on ASCII digits like "41" or "18"
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

  async function speakWithNeuralEngine(langPrefix) {
    if (!isSpeaking || queueIdx >= queue.length) {
      stop();
      return;
    }
    if (isPaused) return;

    const voiceId = PIPER_VOICE_IDS[langPrefix] || PIPER_VOICE_IDS.en;
    try {
      if (queueIdx === 0) updateButtons("⏳ Loading Voice...");
      const wavBlob = await window.PiperTTS.predict({
        text: queue[queueIdx],
        voiceId: voiceId
      });
      if (!isSpeaking) return;
      updateButtons();

      const audioUrl = URL.createObjectURL(wavBlob);
      activeAudio = new Audio(audioUrl);
      const rateSel = document.getElementById("narrator-rate-select");
      activeAudio.playbackRate = rateSel ? parseFloat(rateSel.value) || 0.95 : 0.95;

      activeAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        queueIdx += 1;
        speakWithNeuralEngine(langPrefix);
      };
      activeAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        queueIdx += 1;
        speakWithNeuralEngine(langPrefix);
      };
      await activeAudio.play();
    } catch (err) {
      console.warn("Neural TTS chunk fallback:", err);
      updateButtons();
      speakWithDeviceTTS(langPrefix);
    }
  }

  function speakWithDeviceTTS(langPrefix) {
    if (!synth || !isSpeaking || queueIdx >= queue.length) {
      stop();
      return;
    }
    updateButtons();
    const matching = getMatchingVoices(langPrefix);
    const utter = new SpeechSynthesisUtterance(queue[queueIdx]);
    utter.lang = BCP47_MAP[langPrefix] || "en-IN";

    const sel = document.getElementById("narrator-voice-select");
    if (matching.length > 0 && sel && sel.value !== "__neural__") {
      const chosen = matching.find((v) => v.name === sel.value) || matching[0];
      if (chosen) utter.voice = chosen;
    }

    const rateSel = document.getElementById("narrator-rate-select");
    utter.rate = rateSel ? parseFloat(rateSel.value) || 0.95 : 0.95;

    utter.onend = () => {
      queueIdx += 1;
      setTimeout(() => speakWithDeviceTTS(langPrefix), 50);
    };
    utter.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      // Skip problematic chunk instead of aborting the whole reading
      queueIdx += 1;
      setTimeout(() => speakWithDeviceTTS(langPrefix), 50);
    };
    synth.speak(utter);
  }

  function speakNextChunk() {
    const langPrefix = LANG_MAP[getActiveLang()] || "en";
    const sel = document.getElementById("narrator-voice-select");
    const useNeural = !isFileProtocol() && window.PiperTTS && (!sel || sel.value === "__neural__");

    if (useNeural) {
      speakWithNeuralEngine(langPrefix);
    } else {
      speakWithDeviceTTS(langPrefix);
    }
  }

  function speakText(fullText, source) {
    stop();
    const langPrefix = LANG_MAP[getActiveLang()] || "en";
    queue = buildSentenceChunks(fullText, langPrefix);
    if (queue.length === 0) return;

    isSpeaking = true;
    isPaused = false;
    activeSource = source;
    queueIdx = 0;
    updateButtons();

    keepAliveTimer = setInterval(() => {
      if (synth && synth.speaking && !synth.paused) {
        synth.resume();
      }
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
    const title = document.getElementById("story-title")?.textContent || "";
    const body = document.getElementById("story-content")?.textContent || "";
    speakText(`${title}. ${body}`, "story");
  }

  function speakGuruAnswer() {
    const q = document.getElementById("guru-answer-q")?.textContent || "";
    const a = document.getElementById("guru-answer-a")?.textContent || "";
    speakText(`${q}. ${a}`, "guru");
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

  return { init, stop, populateVoiceDropdown, downloadOfflineVoicePack };
})();