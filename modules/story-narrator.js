window.StoryNarratorModule = (function () {
  const synth = window.speechSynthesis;
  let allVoices = [];
  let isSpeaking = false;
  let isPaused = false;
  let activeSource = null;
  let queue = [];
  let queueIdx = 0;
  let keepAliveTimer = null;
  let fallbackAudio = null;

  const LANG_MAP = { en: "en", te: "te", hi: "hi" };

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

    if (matching.length === 0) {
      const label =
        langPrefix === "te"
          ? "🎙️ Cloud Telugu Voice (Auto)"
          : langPrefix === "hi"
          ? "🎙️ Cloud Hindi Voice (Auto)"
          : "🎙️ Default Voice";
      sel.innerHTML = `<option value="">${label}</option>`;
      return;
    }

    const savedVoice = localStorage.getItem("ayyappa_voice_" + langPrefix) || "";
    sel.innerHTML = matching.map((v) => {
      const selected = v.name === savedVoice ? "selected" : "";
      const cleanName = v.name.replace(/Microsoft |Google |Android |Online \(Natural\) - /g, "");
      return `<option value="${v.name}" ${selected}>🎙️ ${cleanName}</option>`;
    }).join("");
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
    if (fallbackAudio) {
      fallbackAudio.pause();
      fallbackAudio.src = "";
      fallbackAudio = null;
    }
    isSpeaking = false;
    isPaused = false;
    activeSource = null;
    queue = [];
    queueIdx = 0;
    updateButtons();
  }

  function buildSentenceChunks(rawText) {
    const cleaned = rawText
      .replace(/[•▪◆►]/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    const rawSentences = cleaned.split(/(?<=[.!?।])\s+|\n+/);
    const chunks = [];
    for (const s of rawSentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      if (trimmed.length <= 130) {
        chunks.push(trimmed);
      } else {
        const subParts = trimmed.match(/.{1,120}(?:\s|,|$)/g) || [trimmed];
        subParts.forEach((p) => { if (p.trim()) chunks.push(p.trim()); });
      }
    }
    return chunks;
  }

  // Fallback natural Indian audio stream when browser lacks local Telugu/Hindi TTS
  function speakViaCloudAudio(langPrefix) {
    if (!isSpeaking || queueIdx >= queue.length) {
      stop();
      return;
    }
    if (isPaused) return;

    const textChunk = encodeURIComponent(queue[queueIdx]);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langPrefix}&client=tw-ob&q=${textChunk}`;
    fallbackAudio = new Audio(url);
    const rateSel = document.getElementById("narrator-rate-select");
    fallbackAudio.playbackRate = rateSel ? parseFloat(rateSel.value) || 0.95 : 0.95;

    fallbackAudio.onended = () => {
      queueIdx += 1;
      speakViaCloudAudio(langPrefix);
    };
    fallbackAudio.onerror = () => stop();
    fallbackAudio.play().catch(() => stop());
  }

  function speakNextChunk() {
    if (!isSpeaking || queueIdx >= queue.length) {
      stop();
      return;
    }

    const langPrefix = LANG_MAP[getActiveLang()] || "en";
    const matching = getMatchingVoices(langPrefix);

    // If browser has NO local voice for Telugu/Hindi, immediately use natural cloud audio stream
    if (matching.length === 0 && langPrefix !== "en") {
      speakViaCloudAudio(langPrefix);
      return;
    }

    const utter = new SpeechSynthesisUtterance(queue[queueIdx]);
    utter.lang = langPrefix === "te" ? "te-IN" : langPrefix === "hi" ? "hi-IN" : "en-IN";

    const sel = document.getElementById("narrator-voice-select");
    if (matching.length > 0) {
      const chosen = matching.find((v) => v.name === (sel && sel.value)) || matching[0];
      if (chosen) utter.voice = chosen;
    }

    const rateSel = document.getElementById("narrator-rate-select");
    utter.rate = rateSel ? parseFloat(rateSel.value) || 0.95 : 0.95;

    utter.onend = () => {
      queueIdx += 1;
      setTimeout(speakNextChunk, 40);
    };
    utter.onerror = (e) => {
      if (e.error !== "interrupted") stop();
    };

    synth.speak(utter);
  }

  function speakText(fullText, source) {
    stop();
    queue = buildSentenceChunks(fullText);
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

    setTimeout(speakNextChunk, 60);
  }

  function toggleStoryNarration() {
    if (isSpeaking && activeSource === "story" && !isPaused) {
      if (fallbackAudio) fallbackAudio.pause();
      else if (synth) synth.pause();
      isPaused = true;
      updateButtons();
      return;
    }
    if (isSpeaking && activeSource === "story" && isPaused) {
      isPaused = false;
      updateButtons();
      if (fallbackAudio) fallbackAudio.play();
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

  return { init, stop, populateVoiceDropdown };
})();