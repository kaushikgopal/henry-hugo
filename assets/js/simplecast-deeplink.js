/**
 * Keep episode deep links on Fragmented while still using Simplecast's player.
 *
 * Simplecast reads the start time from the iframe URL, not the parent page.
 * Mirror the page timestamp into the embed so `/episodes/309?t=6:40` starts at
 * the right point without sending listeners to a third-party page.
 */
(function () {
  "use strict";

  function init() {
    const timestamp = getTimestamp();
    const players = Array.from(document.querySelectorAll("iframe[data-simplecast-player]"));
    initializeCopyCurrentTimeButton(players[0], timestamp);

    if (!timestamp) return;

    mirrorTimestampIntoPlayers(timestamp, players);
    normalizePageUrl(timestamp);
  }

  function initializeCopyCurrentTimeButton(playerFrame, timestamp) {
    const copyButton = document.querySelector("[data-copy-current-time]");
    if (!copyButton) return;

    const initialSeconds = timestamp ? timestampToSeconds(timestamp) : 0;
    const shareController = new CurrentTimeLinkController(copyButton, playerFrame, initialSeconds);
    shareController.init();
  }

  function getTimestamp() {
    const params = new URLSearchParams(window.location.search);
    const explicitTimestamp = normalizeTimestamp(params.get("t"));
    if (explicitTimestamp) return explicitTimestamp;

    for (const key of params.keys()) {
      const legacyMatch = key.match(/^t(\d+)$/);
      if (legacyMatch) {
        return normalizeTimestamp(legacyMatch[1]);
      }
    }

    return null;
  }

  function normalizeTimestamp(rawTimestamp) {
    if (!rawTimestamp) return null;

    const timestamp = rawTimestamp.trim();
    if (timestamp === "") return null;

    if (/^\d+$/.test(timestamp)) {
      return formatClock(parseInt(timestamp, 10));
    }

    const clockMatch = timestamp.match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/);
    if (clockMatch) {
      const hours = clockMatch[1] ? parseInt(clockMatch[1], 10) : 0;
      const minutes = parseInt(clockMatch[2], 10);
      const seconds = parseInt(clockMatch[3], 10);
      return formatClock(hours * 3600 + minutes * 60 + seconds);
    }

    const shorthandMatch = timestamp.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
    if (shorthandMatch && (shorthandMatch[1] || shorthandMatch[2] || shorthandMatch[3])) {
      const hours = shorthandMatch[1] ? parseInt(shorthandMatch[1], 10) : 0;
      const minutes = shorthandMatch[2] ? parseInt(shorthandMatch[2], 10) : 0;
      const seconds = shorthandMatch[3] ? parseInt(shorthandMatch[3], 10) : 0;
      return formatClock(hours * 3600 + minutes * 60 + seconds);
    }

    return null;
  }

  function formatClock(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function timestampToSeconds(timestamp) {
    const parts = timestamp.split(":").map(function (part) {
      return parseInt(part, 10);
    });

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return 0;
  }

  function mirrorTimestampIntoPlayers(timestamp, players) {
    players.forEach(function (player) {
      const playerUrl = new URL(player.getAttribute("src"), window.location.origin);
      if (playerUrl.searchParams.get("t") === timestamp) return;

      playerUrl.searchParams.set("t", timestamp);
      player.setAttribute("src", playerUrl.toString());
    });
  }

  function normalizePageUrl(timestamp) {
    const params = new URLSearchParams(window.location.search);
    let shouldRewriteUrl = false;

    if (params.get("t") !== timestamp) {
      params.set("t", timestamp);
      shouldRewriteUrl = true;
    }

    Array.from(params.keys()).forEach(function (key) {
      if (/^t\d+$/.test(key)) {
        params.delete(key);
        shouldRewriteUrl = true;
      }
    });

    if (!shouldRewriteUrl) return;

    const queryString = params.toString().replace(/%3A/gi, ":");
    const normalizedUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", normalizedUrl);
  }

  function CurrentTimeLinkController(button, playerFrame, initialSeconds) {
    this.button = button;
    this.player = playerFrame ? new SimplecastEmbedController(playerFrame) : null;
    this.currentSeconds = initialSeconds;
    this.feedbackTimer = null;
    this.defaultLabel = "Copy Episode Link";
    this.prefixLabel = "Copy Link at";
    this.copiedLabel = "Copied";
  }

  CurrentTimeLinkController.prototype.init = function () {
    this.updateButtonLabel();

    this.button.addEventListener("click", this.handleClick.bind(this));

    if (!this.player) return;

    this.player.on("timeupdate", function (payload) {
      this.currentSeconds = normalizeSeconds(payload && payload.seconds, this.currentSeconds);
      this.updateButtonLabel();
    }.bind(this));

    this.player.requestCurrentTime(function (seconds) {
      this.currentSeconds = normalizeSeconds(seconds, this.currentSeconds);
      this.updateButtonLabel();
    }.bind(this));
  };

  CurrentTimeLinkController.prototype.handleClick = function (event) {
    event.preventDefault();

    if (!this.player) {
      this.copyCurrentLink(this.currentSeconds);
      return;
    }

    let resolved = false;
    const fallback = window.setTimeout(function () {
      if (resolved) return;
      resolved = true;
      this.copyCurrentLink(this.currentSeconds);
    }.bind(this), 250);

    this.player.requestCurrentTime(function (seconds) {
      if (resolved) return;
      resolved = true;
      window.clearTimeout(fallback);
      this.currentSeconds = normalizeSeconds(seconds, this.currentSeconds);
      this.copyCurrentLink(this.currentSeconds);
    }.bind(this));
  };

  CurrentTimeLinkController.prototype.copyCurrentLink = function (seconds) {
    const shareUrl = new URL(window.location.pathname, window.location.origin);
    const normalizedSeconds = normalizeSeconds(seconds, 0);
    const timestamp = formatClock(normalizedSeconds);

    if (timestamp) {
      shareUrl.searchParams.set("t", timestamp);
    }

    copyTextToClipboard(shareUrl.toString()).then(function () {
      this.updateCopiedState(timestamp);
    }.bind(this));
  };

  CurrentTimeLinkController.prototype.updateCopiedState = function (timestamp) {
    this.button.textContent = timestamp ? `${this.copiedLabel} ${timestamp}` : `${this.copiedLabel} Link`;

    if (this.feedbackTimer) {
      window.clearTimeout(this.feedbackTimer);
    }

    this.feedbackTimer = window.setTimeout(function () {
      this.updateButtonLabel();
      this.feedbackTimer = null;
    }.bind(this), 1600);
  };

  CurrentTimeLinkController.prototype.updateButtonLabel = function () {
    const timestamp = formatClock(this.currentSeconds);
    this.button.textContent = timestamp ? `${this.prefixLabel} ${timestamp}` : this.defaultLabel;
  };

  function normalizeSeconds(seconds, fallback) {
    const numericSeconds = Number(seconds);
    if (!Number.isFinite(numericSeconds) || numericSeconds < 0) {
      return fallback;
    }

    return Math.floor(numericSeconds);
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = text;
      temporaryInput.setAttribute("readonly", "");
      temporaryInput.style.position = "absolute";
      temporaryInput.style.left = "-9999px";

      document.body.appendChild(temporaryInput);
      temporaryInput.select();

      try {
        document.execCommand("copy");
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(temporaryInput);
      }
    });
  }

  function SimplecastEmbedController(frame) {
    this.frame = frame;
    this.origin = new URL(frame.getAttribute("src"), window.location.origin).origin;
    this.callbacks = new Map();

    // Re-register listeners after iframe reloads so the share button keeps
    // working when the embed source is rewritten with a timestamp.
    this.frame.addEventListener("load", this.restoreListeners.bind(this));
    window.addEventListener("message", this.handleMessage.bind(this));
  }

  SimplecastEmbedController.prototype.on = function (eventName, callback) {
    const listenerId = createListenerId();
    this.callbacks.set(listenerId, {
      callback: callback,
      eventName: eventName,
      persistent: true,
    });

    this.post({
      listener: listenerId,
      method: "addEventListener",
      value: eventName,
    });
  };

  SimplecastEmbedController.prototype.requestCurrentTime = function (callback) {
    const listenerId = createListenerId();
    this.callbacks.set(listenerId, {
      callback: callback,
      eventName: "getCurrentTime",
      persistent: false,
    });

    this.post({
      listener: listenerId,
      method: "getCurrentTime",
    });
  };

  SimplecastEmbedController.prototype.restoreListeners = function () {
    this.callbacks.forEach(function (entry, listenerId) {
      if (!entry.persistent) return;

      this.post({
        listener: listenerId,
        method: "addEventListener",
        value: entry.eventName,
      });
    }.bind(this));
  };

  SimplecastEmbedController.prototype.handleMessage = function (event) {
    if (event.origin !== this.origin) return;

    let payload;

    try {
      payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    } catch (_error) {
      return;
    }

    if (!payload || payload.context !== "player.js" || !payload.listener) return;

    const callbackEntry = this.callbacks.get(payload.listener);
    if (!callbackEntry) return;

    callbackEntry.callback(payload.value);

    if (!callbackEntry.persistent) {
      this.callbacks.delete(payload.listener);
    }
  };

  SimplecastEmbedController.prototype.post = function (message) {
    if (!this.frame.contentWindow) return;

    this.frame.contentWindow.postMessage(JSON.stringify({
      context: "player.js",
      version: "0.0.11",
      ...message,
    }), this.origin);
  };

  function createListenerId() {
    return `listener-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
