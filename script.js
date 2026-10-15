
(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     1. Utilitaires
     ------------------------------------------------------------------------ */

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) =>
    Array.prototype.slice.call((scope || document).querySelectorAll(selector));

  const random = (min, max) => Math.random() * (max - min) + min;
  const randomInt = (min, max) => Math.floor(random(min, max + 1));
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const HEART_EMOJIS = ["💗", "💖", "💕", "❤️", "💞", "🌸", "✨"];

  /* ------------------------------------------------------------------------
     2. Transition entre les pages (voile rose)
     ------------------------------------------------------------------------ */

  const veil = $(".page-veil");

  if (veil) {
    const markReady = () => veil.classList.add("is-ready");
    veil.addEventListener("animationend", markReady, { once: true });
    // Filet de sécurité si l'animation ne se déclenche pas.
    window.setTimeout(markReady, 900);
  }

  function leaveTo(url) {
    if (veil) {
      veil.classList.add("is-active");
    }
    window.setTimeout(
      () => {
        window.location.href = url;
      },
      prefersReducedMotion ? 60 : 420,
    );
  }

  /* ------------------------------------------------------------------------
     3. Cœurs flottants
     ------------------------------------------------------------------------ */

  const heartsLayer = $("#heartsLayer");

  function spawnHeart(options) {
    if (!heartsLayer) return;

    const opts = options || {};
    const size = opts.size !== undefined ? opts.size : random(15, 32);
    const duration =
      opts.duration !== undefined ? opts.duration : random(5, 8.5);
    const delay = opts.delay !== undefined ? opts.delay : 0;

    const heart = document.createElement("span");
    heart.className = "heart";
    heart.textContent = HEART_EMOJIS[randomInt(0, HEART_EMOJIS.length - 1)];
    heart.setAttribute("aria-hidden", "true");

    heart.style.left =
      (opts.left !== undefined ? opts.left : random(2, 96)) + "vw";
    heart.style.fontSize = size.toFixed(1) + "px";
    heart.style.animationDuration = duration.toFixed(2) + "s";
    heart.style.animationDelay = delay.toFixed(2) + "s";

    heartsLayer.appendChild(heart);

    // Nettoyage automatique du DOM.
    const lifetime = (duration + delay + 0.8) * 1000;
    window.setTimeout(() => {
      if (heart.parentNode) heart.parentNode.removeChild(heart);
    }, lifetime);
  }

  function burstHearts(count) {
    const total = count || 36;
    for (let i = 0; i < total; i += 1) {
      window.setTimeout(() => {
        spawnHeart({
          size: random(18, 44),
          duration: random(3.4, 6.2),
          left: random(2, 96),
        });
      }, i * 34);
    }
  }

  /* ------------------------------------------------------------------------
     4. Page 1 & 3 — apparition progressive des textes
     ------------------------------------------------------------------------ */

  $$(".reveal").forEach((element, index) => {
    element.style.animationDelay = (0.2 + index * 0.18).toFixed(2) + "s";
  });

  /* ------------------------------------------------------------------------
     5. Page finale — ambiance de cœurs
     ------------------------------------------------------------------------ */

  const isFinalPage = document.body.classList.contains("page--final");

  if (isFinalPage && heartsLayer) {
    burstHearts(14);

    let spawned = 0;
    const ambient = window.setInterval(() => {
      spawnHeart({ duration: random(7, 11), size: random(13, 26) });
      spawned += 1;
      if (spawned >= 40) window.clearInterval(ambient);
    }, 1100);
  }

  /* ------------------------------------------------------------------------
     6. Page 2 — éléments interactifs
     ------------------------------------------------------------------------ */

  const acceptButton = $("#acceptButton");
  const rejectButton = $("#rejectButton");
  const feedback = $("#feedback");

  /* --- 6.1 Bouton « Oui » ------------------------------------------------ */

  function handleAccept() {
    if (!acceptButton || acceptButton.dataset.busy === "true") return;
    acceptButton.dataset.busy = "true";

    acceptButton.classList.add("is-success");
    acceptButton.textContent = "💗 Merci beaucoup !";

    if (rejectButton) {
      rejectButton.style.opacity = "0";
      rejectButton.style.pointerEvents = "none";
    }

    setFeedback("Youpi ! Je savais que tu avais un cœur en or 🥰");

    burstHearts(52);
    leaveTo("page3.html");
  }

  if (acceptButton) {
    acceptButton.addEventListener("click", handleAccept);
  }

  /* --- 6.2 Bouton « Non » fuyant ---------------------------------------- */

  const REJECT_LABELS = [
    "😤 Non",
    "Attends 😭",
    "Tu es sûre ?",
    "Réfléchis encore 🥺",
    "Impossible 😅",
    "Essaie encore 😂",
    "Toujours non ? 😳",
    "Pitié… 🥹",
    "Je vais pleurer 😭",
    "Non non non 😵",
  ];

  const REJECT_MESSAGES = [
    "Oups 😅 essaie encore...",
    "Tu es vraiment sûre ? 🥺",
    "Réfléchis bien... 😭",
    "Ce bouton est timide, il se sauve 🙈",
    "Tu peux toujours courir 🏃‍♀️💨",
    "Même le bouton est de mon côté 😌",
    "Il paraît que « Oui » est beaucoup plus simple 💗",
    "Bon... on arrête de jouer ? 🥺",
  ];

  const DODGE_COOLDOWN = 400; // ms — évite les déplacements en rafale
  const SAFE_MARGIN = 14; // px — marge de sécurité avec les bords
  const POINTER_KEEPOUT = 110; // px — rayon à éviter autour du curseur / doigt

  let noAttempts = 0;
  let isFloating = false;
  let lastDodgeAt = 0;
  let pointer = { x: -9999, y: -9999 };

  if (rejectButton) {
    // Desktop : le bouton esquive le curseur.
    rejectButton.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      dodge(event);
    });

    // Mobile : le bouton esquive le doigt avant même le tap.
    rejectButton.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches && event.touches[0];
        if (touch) {
          pointer = { x: touch.clientX, y: touch.clientY };
        }
        // Empêche le clic fantôme qui suivrait le déplacement.
        event.preventDefault();
        dodge();
      },
      { passive: false },
    );

    // Clavier & clic classique.
    rejectButton.addEventListener("click", (event) => {
      dodge(event);
    });

    window.addEventListener("resize", keepRejectButtonOnScreen);
    window.addEventListener("orientationchange", keepRejectButtonOnScreen);
  }

  /* --- 6.3 Logique de déplacement --------------------------------------- */

  function dodge(event) {
    if (!rejectButton) return;

    const now = Date.now();
    if (now - lastDodgeAt < DODGE_COOLDOWN) return;
    lastDodgeAt = now;

    if (
      event &&
      typeof event.clientX === "number" &&
      (event.clientX !== 0 || event.clientY !== 0)
    ) {
      pointer = { x: event.clientX, y: event.clientY };
    }

    noAttempts += 1;

    if (!isFloating) {
      detachRejectButton();
    }

    const rect = rejectButton.getBoundingClientRect();
    const target = findSafeSpot(rect.width, rect.height);

    rejectButton.style.left = target.x.toFixed(1) + "px";
    rejectButton.style.top = target.y.toFixed(1) + "px";
    rejectButton.style.transform =
      "rotate(" +
      random(-10, 10).toFixed(1) +
      "deg) scale(" +
      random(0.9, 1.06).toFixed(2) +
      ")";

    const labelIndex = Math.min(noAttempts, REJECT_LABELS.length - 1);
    rejectButton.textContent = REJECT_LABELS[labelIndex];

    const messageIndex = Math.min(noAttempts - 1, REJECT_MESSAGES.length - 1);
    setFeedback(REJECT_MESSAGES[messageIndex]);
  }

  /**
   * Sort le bouton « Non » du flux normal pour qu'il puisse se déplacer
   * librement dans toute la fenêtre, tout en conservant la mise en page.
   */
  function detachRejectButton() {
    const rect = rejectButton.getBoundingClientRect();

    // Espaceur : garde la place du bouton pour que « Oui » ne bouge pas.
    const spacer = document.createElement("span");
    spacer.className = "btn-spacer";
    spacer.style.width = rect.width + "px";
    spacer.style.height = rect.height + "px";
    spacer.setAttribute("aria-hidden", "true");

    if (rejectButton.parentNode) {
      rejectButton.parentNode.insertBefore(spacer, rejectButton);
    }

    // On déplace le bouton dans <body> : la carte est animée (transform),
    // ce qui casserait un position: fixed placé à l'intérieur.
    document.body.appendChild(rejectButton);

    rejectButton.style.width = rect.width + "px";
    rejectButton.style.height = rect.height + "px";
    rejectButton.style.left = rect.left + "px";
    rejectButton.style.top = rect.top + "px";
    rejectButton.classList.add("is-floating");

    isFloating = true;

    // Force le navigateur à enregistrer la position de départ.
    void rejectButton.offsetWidth;
  }

  /**
   * Cherche une position visible, éloignée du curseur / doigt
   * et qui ne recouvre pas le bouton « Oui ».
   */
  function findSafeSpot(width, height) {
    const maxX = Math.max(SAFE_MARGIN, window.innerWidth - width - SAFE_MARGIN);
    const maxY = Math.max(
      SAFE_MARGIN,
      window.innerHeight - height - SAFE_MARGIN,
    );

    const acceptRect = acceptButton
      ? acceptButton.getBoundingClientRect()
      : null;
    const currentRect = rejectButton.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    // Contraintes de plus en plus souples si l'écran est petit.
    const profiles = [
      { travel: 90, keepout: POINTER_KEEPOUT },
      { travel: 60, keepout: 70 },
      { travel: 0, keepout: 40 },
      { travel: 0, keepout: 0 },
    ];

    for (let p = 0; p < profiles.length; p += 1) {
      const profile = profiles[p];

      for (let i = 0; i < 30; i += 1) {
        const x = random(SAFE_MARGIN, maxX);
        const y = random(SAFE_MARGIN, maxY);
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        const pointerDistance = Math.hypot(
          centerX - pointer.x,
          centerY - pointer.y,
        );
        if (pointerDistance < profile.keepout) continue;

        if (
          acceptRect &&
          overlaps({ x: x, y: y, width: width, height: height }, acceptRect)
        ) {
          continue;
        }

        const travel = Math.hypot(
          centerX - currentCenter.x,
          centerY - currentCenter.y,
        );
        if (travel < profile.travel) continue;

        return { x: x, y: y };
      }
    }

    // Dernier recours : on envoie le bouton dans le coin opposé.
    return {
      x: currentCenter.x < window.innerWidth / 2 ? maxX : SAFE_MARGIN,
      y: currentCenter.y < window.innerHeight / 2 ? maxY : SAFE_MARGIN,
    };
  }

  function overlaps(rect, domRect) {
    return !(
      rect.x + rect.width < domRect.left - 10 ||
      rect.x > domRect.right + 10 ||
      rect.y + rect.height < domRect.top - 10 ||
      rect.y > domRect.bottom + 10
    );
  }

  /**
   * Garde le bouton dans la fenêtre après un redimensionnement
   * ou une rotation d'écran.
   */
  function keepRejectButtonOnScreen() {
    if (!isFloating || !rejectButton) return;

    const width = rejectButton.offsetWidth;
    const height = rejectButton.offsetHeight;

    const maxX = Math.max(SAFE_MARGIN, window.innerWidth - width - SAFE_MARGIN);
    const maxY = Math.max(
      SAFE_MARGIN,
      window.innerHeight - height - SAFE_MARGIN,
    );

    const currentX = parseFloat(rejectButton.style.left);
    const currentY = parseFloat(rejectButton.style.top);

    rejectButton.style.left =
      clamp(
        isNaN(currentX) ? SAFE_MARGIN : currentX,
        SAFE_MARGIN,
        maxX,
      ).toFixed(1) + "px";
    rejectButton.style.top =
      clamp(
        isNaN(currentY) ? SAFE_MARGIN : currentY,
        SAFE_MARGIN,
        maxY,
      ).toFixed(1) + "px";
  }

  /* --- 6.4 Message de retour -------------------------------------------- */

  function setFeedback(message) {
    if (!feedback) return;

    feedback.textContent = message;
    feedback.classList.remove("is-visible");

    // Redémarre la transition.
    void feedback.offsetWidth;

    feedback.classList.add("is-visible");
  }
})();

const music = document.getElementById('bgMusic');
const toggle = document.getElementById('musicToggle');

toggle.addEventListener('click', () => {
  if (music.paused) {
    music.play();
  } else {
    music.pause();
  }
});