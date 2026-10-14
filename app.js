/* ============================================================
   Логика визитки. Обычно править не нужно — данные в data.js
   ============================================================ */
(function () {
  "use strict";

  var C = window.CARD || {};

  /* ---------- утилиты ---------- */

  function $(id) { return document.getElementById(id); }

  function initials(f, l) {
    return ((f || " ")[0] + (l || " ")[0]).toUpperCase().trim() || "?";
  }

  // Экранирование значений для vCard
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  // Перенос длинных строк vCard (RFC требует складку по 75 октетов)
  function fold(line) {
    var out = "", i;
    for (i = 0; i < line.length; i += 73) {
      out += (i === 0 ? "" : "\r\n ") + line.substr(i, 73);
    }
    return out;
  }

  // +7 999 000-00-00 -> +79990000000
  function telDigits(s) { return String(s || "").replace(/[^\d+]/g, ""); }

  // MAX — поддерживаем и строчный «max», и «MAX» на всякий случай
  function maxLink() { return C.max || C.MAX || ""; }

  /* ---------- сборка .vcf ---------- */

  function buildVCard() {
    var L = [];
    L.push("BEGIN:VCARD");
    L.push("VERSION:3.0");
    L.push("N:" + esc(C.lastName) + ";" + esc(C.firstName) + ";;;");
    L.push("FN:" + esc([C.firstName, C.lastName].filter(Boolean).join(" ")));
    if (C.company) L.push("ORG:" + esc(C.company) + (C.department ? ";" + esc(C.department) : ""));
    if (C.title) L.push("TITLE:" + esc(C.title));
    if (C.phone) L.push("TEL;TYPE=CELL,VOICE:" + esc(C.phone));
    if (C.email) L.push("EMAIL;TYPE=WORK,INTERNET:" + esc(C.email));
    if (C.website) L.push("URL:" + esc(C.website));

    var a = C.address || {};
    if (a.street || a.city || a.zip || a.country) {
      L.push("ADR;TYPE=WORK:;;" + esc(a.street) + ";" + esc(a.city) + ";;" + esc(a.zip) + ";" + esc(a.country));
    }

    if (C.telegram) L.push("X-SOCIALPROFILE;TYPE=telegram:" + esc(C.telegram));
    if (maxLink()) L.push("X-SOCIALPROFILE;TYPE=max:" + esc(maxLink()));
    if (C.website) L.push("X-SOCIALPROFILE;TYPE=web:" + esc(C.website));

    if (C.photo) L.push("PHOTO;VALUE=URI:" + esc(C.photo));
    if (C.note) L.push("NOTE:" + esc(C.note));

    L.push("REV:" + new Date().toISOString().replace(/\.\d{3}/, ""));
    L.push("END:VCARD");

    return L.map(fold).join("\r\n") + "\r\n";
  }

  function vCardFileName() {
    var n = (C.lastName || "") + "_" + (C.firstName || "");
    n = n.replace(/[^\w\u0400-\u04FF-]+/g, "_").replace(/^_+|_+$/g, "");
    return (n || "contact") + ".vcf";
  }

  /* ---------- кнопка «Сохранить контакт» ---------- */

  function saveContact() {
    var data = buildVCard();
    var blob = new Blob([data], { type: "text/vcard;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = vCardFileName();
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast("Открываю контакт…");
  }

  /* ---------- тост ---------- */

  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) toastEl = $("toast");
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ---------- ссылка на страницу ---------- */

  function pageUrl() {
    if (C.pageUrl) return C.pageUrl;
    var u = location.href.split("#")[0];
    return u;
  }

  function isPublic(u) {
    return /^https?:\/\//i.test(u) && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(u);
  }

  /* ---------- рендер ---------- */

  function render() {
    document.title = [C.firstName, C.lastName].filter(Boolean).join(" ") + " — визитка";
    if (C.accent) document.documentElement.style.setProperty("--accent", C.accent);

    var av = $("avatar");
    if (C.photo) {
      av.innerHTML = "";
      var img = document.createElement("img");
      img.src = C.photo;
      img.alt = "";
      av.appendChild(img);
    } else {
      av.textContent = initials(C.firstName, C.lastName);
    }

    $("name").textContent = [C.firstName, C.lastName].filter(Boolean).join(" ");
    $("role").textContent = C.title || "";
    $("company").textContent = [C.company, C.department].filter(Boolean).join(", ");
    $("foot-name").textContent = [C.company, C.website].filter(Boolean).join(" · ");

    // Быстрые действия
    var nav = $("actions");
    var items = [];

    if (C.phone) items.push({
      label: "Позвонить", href: "tel:" + telDigits(C.phone),
      icon: '<path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1l-2.3 2.3Z"/>'
    });

    if (C.email) items.push({
      label: "Email", href: "mailto:" + C.email,
      icon: '<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm9 7.2L4.3 7h15.4L12 12.2ZM4 8.6V17h16V8.6l-8 5.3-8-5.3Z"/>'
    });

    if (maxLink()) items.push({
      label: "MAX", href: maxLink(),
      icon: '<path d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.2v3.3a.7.7 0 0 0 1.14.55L12.6 18H20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-9.1 10.4V9.2c0-.5-.6-.75-.94-.4l-2.2 2.2a.6.6 0 0 1-.86 0L4.7 8.8c-.35-.35-.95-.1-.95.4v3.2a.6.6 0 0 0 1.2 0v-1.5l1.3 1.3c.23.23.6.23.83 0l1.3-1.3v1.5a.6.6 0 0 0 1.2 0h.32Zm5.4 0a.6.6 0 0 1-1.16.1l-.5-1.5-.5 1.5a.6.6 0 0 1-1.15-.1l-1-3.2a.6.6 0 0 1 1.15-.36l.5 1.6.5-1.6a.6.6 0 0 1 1.15 0l.5 1.6.5-1.6a.6.6 0 0 1 1.15.36l-1 3.2Z"/>'
    });

    if (C.telegram) items.push({
      label: "Telegram", href: C.telegram,
      icon: '<path d="M21.9 4.3 19 19.1c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L7.5 12.8 3 11.4c-1-.3-1-1 .2-1.4l17.3-6.7c.8-.3 1.5.2 1.4 1Z"/>'
    });

    if (C.whatsapp) items.push({
      label: "WhatsApp",
      href: /^https?:/i.test(C.whatsapp) ? C.whatsapp : "https://wa.me/" + telDigits(C.whatsapp).replace(/\D/g, ""),
      icon: '<path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.5-5.9c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.5-.6c.2-.2.1-.4 0-.6l-.7-1.6c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.3.3-.9 1-.9 2.3s.9 2.6 1 2.8c.1.2 1.8 2.8 4.4 3.8 1.6.6 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1 0-.1-.2-.2-.4-.3Z"/>'
    });

    if (C.website) items.push({
      label: "Сайт", href: C.website,
      icon: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-2.6a13 13 0 0 0-1.1-3 8 8 0 0 1 3.7 3ZM12 4c.7 1 1.3 2.2 1.7 4h-3.4C10.7 6.2 11.3 5 12 4ZM4.3 14a8 8 0 0 1 0-4h3a19 19 0 0 0 0 4h-3Zm.8 2h2.6c.3 1.1.7 2.1 1.1 3a8 8 0 0 1-3.7-3Zm2.6-8H5.1a8 8 0 0 1 3.7-3c-.4.9-.8 1.9-1.1 3ZM12 20c-.7-1-1.3-2.2-1.7-4h3.4c-.4 1.8-1 3-1.7 4Zm2.1-6H9.9a17 17 0 0 1 0-4h4.2a17 17 0 0 1 0 4Zm.6 5c.4-.9.8-1.9 1.1-3h2.6a8 8 0 0 1-3.7 3Zm1.6-5a19 19 0 0 0 0-4h3a8 8 0 0 1 0 4h-3Z"/>'
    });

    items.forEach(function (it) {
      var a = document.createElement("a");
      a.className = "action";
      a.href = it.href;
      if (/^https?:/i.test(it.href)) { a.target = "_blank"; a.rel = "noopener"; }
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + it.icon + "</svg><span>" + it.label + "</span>";
      nav.appendChild(a);
    });
    if (!items.length) nav.style.display = "none";

    // QR
    var url = pageUrl();
    if (isPublic(url)) {
      var qr = $("qr");
      qr.onload = function () { qr.hidden = false; $("qr-fallback").hidden = true; };
      qr.onerror = function () { qr.hidden = true; $("qr-fallback").hidden = false; };
      qr.src = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=" + encodeURIComponent(url);
    }
  }

  /* ---------- кнопки «позже» ---------- */

  function share() {
    var url = pageUrl();
    var title = [C.firstName, C.lastName].filter(Boolean).join(" ") + (C.company ? " — " + C.company : "");
    if (navigator.share) {
      navigator.share({ title: title, text: "Моя визитка", url: url }).catch(function () {});
    } else {
      copy();
    }
  }

  function copy() {
    var url = pageUrl();
    function done() { toast("Ссылка скопирована"); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); }
      catch (e) { toast(url); }
      ta.remove();
    }
  }

  /* ---------- старт ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    render();
    $("save").addEventListener("click", saveContact);
    $("share").addEventListener("click", share);
    $("copy").addEventListener("click", copy);
  });

  /* отладочный хук: позволяет проверить генерацию контакта из консоли
     или тестом — window.__buildVCard() */
  window.__buildVCard = buildVCard;
})();
