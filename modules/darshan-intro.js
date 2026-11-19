window.DarshanIntroModule = (function () {
  const CUSTOM_DATA_KEY = "ayyappa_custom_content_v1";

  function getDarshanImage() {
    try {
      const local = JSON.parse(localStorage.getItem(CUSTOM_DATA_KEY) || "null") || {};
      if (local.darshanImage) return local.darshanImage;
      if (window.HOSTED_CUSTOM_CONTENT && window.HOSTED_CUSTOM_CONTENT.darshanImage) {
        return window.HOSTED_CUSTOM_CONTENT.darshanImage;
      }
    } catch (e) {}
    return null;
  }

  // Synthesizes authentic bronze temple bell chimes via Web Audio API (zero external files)
  function playTempleBells() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const strikeTimes = [0, 0.55, 1.15];

      strikeTimes.forEach((offset) => {
        const now = ctx.currentTime + offset;
        [523.25, 1046.5, 1567.98, 2489.02].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx % 2 === 0 ? "sine" : "triangle";
          osc.frequency.setValueAtTime(freq, now);

          const peak = 0.22 / (idx + 1);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(peak, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 2.5);
        });
      });
    } catch (e) {}
  }

  function speakSacredMantra() {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance("Om Swamiye Saranam Ayyappa");
      utter.lang = "en-IN";
      utter.rate = 0.85;
      utter.pitch = 0.95;
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  function buildStepsHtml() {
    let steps = "";
    for (let i = 1; i <= 18; i++) {
      const widthPct = 42 + i * 2.8;
      steps += `<div class="darshan-step mx-auto h-2 sm:h-2.5 rounded-sm border-t border-amber-300/70 bg-gradient-to-r from-amber-900/80 via-amber-600/80 to-amber-900/80 shadow" style="width:${widthPct}%;animation-delay:${(18 - i) * 60}ms"></div>`;
    }
    return steps;
  }

  function injectStyles() {
    if (document.getElementById("darshan-intro-styles")) return;
    const style = document.createElement("style");
    style.id = "darshan-intro-styles";
    style.textContent = `
      @keyframes diyaSway {
        0%, 100% { transform: rotate(-3deg); }
        50% { transform: rotate(3deg); }
      }
      @keyframes flameFlicker {
        0%, 100% { transform: scaleY(1) scaleX(1); opacity: 0.95; }
        50% { transform: scaleY(1.14) scaleX(0.92); opacity: 1; }
      }
      @keyframes bellRing {
        0%, 100% { transform: rotate(0deg); }
        20% { transform: rotate(16deg); }
        40% { transform: rotate(-14deg); }
        60% { transform: rotate(10deg); }
        80% { transform: rotate(-6deg); }
      }
      .darshan-sway { transform-origin: top center; animation: diyaSway 3.6s ease-in-out infinite; }
      .darshan-flame { transform-origin: bottom center; animation: flameFlicker 1.1s ease-in-out infinite; }
      .darshan-bell-ringing { transform-origin: top center; animation: bellRing 0.9s ease-in-out 3; }
    `;
    document.head.appendChild(style);
  }

  function renderHangingLampAndBell(side) {
    return `
      <div class="flex flex-col items-center darshan-sway select-none" style="animation-delay:${side === 'right' ? '0.6s' : '0s'}">
        <div class="w-0.5 h-8 sm:h-12 bg-gradient-to-b from-amber-500/40 to-amber-400"></div>
        <!-- Temple Bell -->
        <svg class="darshan-bell w-9 h-9 sm:w-11 sm:h-11 text-amber-400 drop-shadow" viewBox="0 0 64 64" fill="currentColor">
          <path d="M32 6a4 4 0 0 1 4 4v2.3C44.5 14.2 50 21.8 50 31v11l5 5v3H9v-3l5-5V31c0-9.2 5.5-16.8 14-18.7V10a4 4 0 0 1 4-4zm0 52a6 6 0 0 1-5.6-4h11.2a6 6 0 0 1-5.6 4z"/>
        </svg>
        <div class="w-0.5 h-5 sm:h-7 bg-amber-400/80"></div>
        <!-- Hanging Brass Diya -->
        <svg class="w-10 h-12 sm:w-12 sm:h-14" viewBox="0 0 64 72">
          <ellipse class="darshan-flame" cx="32" cy="18" rx="6" ry="12" fill="#fbbf24"/>
          <ellipse class="darshan-flame" cx="32" cy="20" rx="3" ry="7" fill="#fef3c7"/>
          <path d="M14 34 Q32 46 50 34 L44 46 Q32 52 20 46 Z" fill="#d97706" stroke="#fde68a" stroke-width="1.5"/>
          <rect x="29" y="48" width="6" height="10" fill="#b45309"/>
          <ellipse cx="32" cy="60" rx="12" ry="3.5" fill="#f59e0b"/>
        </svg>
      </div>
    `;
  }

  function init() {
    injectStyles();
    const customImg = getDarshanImage();
    const centerVisual = customImg
      ? `<img src="${customImg}" alt="Lord Ayyappa" class="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-2xl object-cover border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55)]" />`
      : `<div class="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full bg-gradient-to-b from-amber-500/30 to-temple-900 border-2 border-amber-400 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.5)]">
           <span class="text-4xl sm:text-5xl">🕉️</span>
           <span class="text-[11px] text-amber-200 font-display mt-1 tracking-wider">SWAMIYE SARANAM</span>
         </div>`;

    const overlay = document.createElement("div");
    overlay.id = "darshan-intro-overlay";
    overlay.className = "fixed inset-0 z-[1000] bg-[#140d08] flex flex-col items-center justify-between p-4 sm:p-6 text-center transition-opacity duration-700 overflow-y-auto";
    overlay.innerHTML = `
      <!-- Top Arch + Hanging Bells & Diyas -->
      <div class="w-full max-w-lg flex items-start justify-between px-2 sm:px-6">
        ${renderHangingLampAndBell("left")}
        <div class="pt-4">
          <p class="text-xs uppercase tracking-[0.25em] text-amber-400/90">Pathinettu Padi Darshanam</p>
          <h1 class="font-display text-xl sm:text-2xl font-bold text-amber-100 mt-1">ॐ स्वामीये शरणम् अय्यप्पा</h1>
        </div>
        ${renderHangingLampAndBell("right")}
      </div>

      <!-- Lord Ayyappa + 18 Holy Steps -->
      <div class="w-full max-w-md my-2 flex flex-col items-center">
        <div class="mb-2">${centerVisual}</div>
        <div class="w-full space-y-1 px-2">${buildStepsHtml()}</div>
      </div>

      <!-- Action & Offline Voice Pack Controls -->
      <div class="w-full max-w-md space-y-2.5 pb-2">
        <button id="darshan-enter-btn" type="button" class="w-full py-3 px-5 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-amber-600 via-temple-saffron to-amber-600 text-white border border-amber-300/60 shadow-lg cursor-pointer hover:brightness-110 transition">
          🔔 Ring Bells & Enter Peetam
        </button>

        <div id="darshan-voice-box" class="bg-temple-900/90 border border-amber-500/30 rounded-xl p-3 space-y-2">
          <p id="darshan-voice-status" class="text-xs text-amber-200/90">
            🎙️ Offline Neural Voice Pack (Telugu • Hindi • English) ensures clear narration on all phones & laptops.
          </p>
          <div class="flex flex-wrap gap-2 justify-center">
            <button id="darshan-download-voices-btn" type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 cursor-pointer">
              ⬇️ Download Offline Voices (EN • TE • HI)
            </button>
            <button id="darshan-skip-btn" type="button" class="px-3 py-1.5 rounded-lg text-xs text-amber-300/75 hover:text-amber-100 cursor-pointer">
              Enter Directly →
            </button>
          </div>
          <div id="darshan-progress-wrap" class="hidden w-full bg-temple-800 rounded-full h-2 overflow-hidden">
            <div id="darshan-progress-bar" class="bg-temple-gold h-full transition-all duration-300" style="width:0%"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    function closeSplash() {
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 700);
    }

    document.getElementById("darshan-enter-btn").addEventListener("click", () => {
      document.querySelectorAll(".darshan-bell").forEach((b) => {
        b.classList.remove("darshan-bell-ringing");
        void b.offsetWidth;
        b.classList.add("darshan-bell-ringing");
      });
      playTempleBells();
      setTimeout(speakSacredMantra, 450);
      setTimeout(closeSplash, 2600);
    });

    document.getElementById("darshan-skip-btn").addEventListener("click", closeSplash);

    document.getElementById("darshan-download-voices-btn").addEventListener("click", async () => {
      playTempleBells();
      if (window.StoryNarratorModule && window.StoryNarratorModule.downloadOfflineVoicePack) {
        await window.StoryNarratorModule.downloadOfflineVoicePack((pct, msg) => {
          const wrap = document.getElementById("darshan-progress-wrap");
          const bar = document.getElementById("darshan-progress-bar");
          const status = document.getElementById("darshan-voice-status");
          if (wrap) wrap.classList.remove("hidden");
          if (bar) bar.style.width = pct + "%";
          if (status) status.textContent = msg;
        });
        setTimeout(closeSplash, 1200);
      }
    });
  }

  return { init };
})();