window.SelfieAlbumModule = (function () {
  const DB_NAME = "AyyappaDeekshaAlbumDB";
  const STORE_NAME = "selfies";
  let dbInstance = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "day" });
        }
      };
      req.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function savePhoto(day, dataUrl) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({
        day: Number(day),
        image: dataUrl,
        date: new Date().toLocaleDateString()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAllPhotos() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const map = {};
        (req.result || []).forEach((item) => { map[item.day] = item; });
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  }

  function compressAndStampImage(file, dayNum) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxW = 540;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Sacred bottom banner stamp
          const barH = 38;
          ctx.fillStyle = "rgba(18, 12, 8, 0.78)";
          ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
          ctx.fillStyle = "#ffb703";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(`🙏 Mandala Day ${dayNum} • Swamiye Saranam Ayyappa`, 12, canvas.height - 14);

          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function renderGrid(lang) {
    const grid = document.getElementById("selfie-album-grid");
    if (!grid) return;
    const photos = await getAllPhotos();
    const dayWord = lang === "te" ? "రోజు" : lang === "hi" ? "दिन" : "Day";

    let html = "";
    for (let d = 1; d <= 41; d++) {
      const entry = photos[d];
      if (entry) {
        html += `
          <div class="selfie-slot filled" data-day="${d}" title="Tap to update Day ${d}">
            <img src="${entry.image}" alt="Mandala Day ${d}" loading="lazy" />
            <div class="selfie-day-tag">${dayWord} ${d} • ${entry.date}</div>
          </div>`;
      } else {
        html += `
          <div class="selfie-slot" data-day="${d}" title="Add Day ${d} Photo">
            <span style="font-size:1.5rem;opacity:0.5;">📷</span>
            <span style="font-size:0.78rem;color:#c9b9a6;margin-top:4px;">${dayWord} ${d}</span>
          </div>`;
      }
    }
    grid.innerHTML = html;

    grid.querySelectorAll(".selfie-slot").forEach((slot) => {
      slot.addEventListener("click", () => {
        const d = slot.getAttribute("data-day");
        document.getElementById("selfie-day-select").value = d;
        document.getElementById("selfie-file-input").click();
      });
    });
  }

  async function buildKeepsakeCollage() {
    const photos = await getAllPhotos();
    const keys = Object.keys(photos).map(Number).sort((a, b) => a - b);
    const previewBox = document.getElementById("collage-preview-area");
    const canvas = document.getElementById("keepsake-canvas");
    const dlLink = document.getElementById("download-collage-link");
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#140d07";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ffb703";
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    ctx.fillStyle = "#ffb703";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🙏 SWAMIYE SARANAM AYYAPPA — 41-DAY MANDALA SMRUTI 🙏", canvas.width / 2, 52);

    ctx.fillStyle = "#c9b9a6";
    ctx.font = "15px sans-serif";
    ctx.fillText(`Deeksha Days Captured: ${keys.length} / 41`, canvas.width / 2, 78);

    const sampleDays = keys.slice(-4);
    if (sampleDays.length === 0) {
      ctx.fillStyle = "#f5ebe0";
      ctx.font = "18px sans-serif";
      ctx.fillText("Capture at least 1 daily photo to generate your keepsake card!", canvas.width / 2, 270);
    } else {
      const boxW = 190, boxH = 260, gap = 22;
      const totalW = sampleDays.length * boxW + (sampleDays.length - 1) * gap;
      let startX = (canvas.width - totalW) / 2;

      for (const d of sampleDays) {
        await new Promise((res) => {
          const im = new Image();
          im.onload = () => {
            ctx.drawImage(im, startX, 115, boxW, boxH);
            ctx.strokeStyle = "#f4601e";
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, 115, boxW, boxH);
            startX += boxW + gap;
            res();
          };
          im.src = photos[d].image;
        });
      }
    }

    ctx.fillStyle = "#ffb703";
    ctx.font = "italic 16px sans-serif";
    ctx.fillText("“Tat Tvam Asi • Harihara Suthane Saranam Ayyappa”", canvas.width / 2, 475);

    dlLink.href = canvas.toDataURL("image/png");
    previewBox.classList.remove("hidden");
  }

  function init(getLang) {
    const daySelect = document.getElementById("selfie-day-select");
    const fileInput = document.getElementById("selfie-file-input");
    const collageBtn = document.getElementById("generate-collage-btn");
    const closeCollageBtn = document.getElementById("close-collage-btn");

    for (let d = 1; d <= 41; d++) {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = `Day ${d}`;
      daySelect.appendChild(opt);
    }

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const dayNum = daySelect.value || "1";
      const stamped = await compressAndStampImage(file, dayNum);
      await savePhoto(dayNum, stamped);
      fileInput.value = "";
      renderGrid(getLang());
    });

    collageBtn.addEventListener("click", buildKeepsakeCollage);
    closeCollageBtn.addEventListener("click", () => {
      document.getElementById("collage-preview-area").classList.add("hidden");
    });

    renderGrid(getLang());
  }

  return { init, renderGrid };
})();
