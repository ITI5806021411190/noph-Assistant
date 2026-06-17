(function () {
  'use strict';

  const PATCH = 'v70.86-date-coverage';
  if (window.__HAOS_V786_DATE_COVERAGE__) return;
  window.__HAOS_V786_DATE_COVERAGE__ = true;

  const TARGETS = [
    '#notificationCenterList',
    '#notifListBody',
    '#eMeetingPanelV714',
    '#eMeetingPanelV715',
    '#itAssetPanelV70',
    '#itRepairPanelV70',
    '#itMinutesPanelV759',
    '#meetingMinutesPanelV759',
    '#myReportListView',
    '#headReportListView',
    '.swal2-html-container'
  ];

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE']);

  function dateApi() {
    return window.HAOSDateDisplay || null;
  }

  function formatDateToken(token) {
    const D = dateApi();
    if (!D || !token) return token;
    const parsed = D.parseDate(token);
    if (!parsed) return token;
    const hasTime = D.hasTime(token);
    return hasTime ? D.dateTime(token, { forceTime: true }) : D.date(token);
  }

  function formatTimeText(text) {
    return text.replace(/(^|[^\d])([01]?\d|2[0-3]):([0-5]\d)(?!\d)(?:\s*น\.?)?/g, function (_, lead, h, m) {
      return lead + String(h).padStart(2, '0') + '.' + m + ' น.';
    });
  }

  function replaceDateTokens(text) {
    if (!/\d/.test(text || '')) return text;
    let next = text;
    const patterns = [
      /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[T\s]+\d{1,2}[:.]\d{2})?\b/g,
      /\b\d{1,2}[-/]\d{1,2}[-/]\d{4}(?:\s+\d{1,2}[:.]\d{2})?\b/g,
      /\b\d{1,2}\s*[-/]\s*[ก-ฮ.]+\s*[-/]\s*\d{4}(?:\s+\d{1,2}[:.]\d{2})?\b/g,
      /\b\d{1,2}\s+[ก-ฮ.]{2,}\.?\s+\d{4}(?:\s+\d{1,2}[:.]\d{2})?\b/g
    ];
    patterns.forEach(pattern => {
      next = next.replace(pattern, token => formatDateToken(token));
    });
    return formatTimeText(next);
  }

  function shouldSkip(node) {
    const parent = node && node.parentElement;
    if (!parent) return true;
    if (SKIP_TAGS.has(parent.tagName)) return true;
    if (parent.closest('input,textarea,select,option,script,style,pre,code')) return true;
    if (parent.closest('a') && /^https?:\/\//i.test(parent.textContent.trim())) return true;
    return false;
  }

  function normalizeRoot(root) {
    if (!root || !dateApi()) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
        return /\d/.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const oldText = node.nodeValue;
      const newText = replaceDateTokens(oldText);
      if (newText !== oldText) node.nodeValue = newText;
    });
  }

  function fixUndefinedReportPills() {
    document.querySelectorAll('.report-date-pill span:first-child,.haos-v704-date-pill b,.haos-v692-date-pill b').forEach(el => {
      if (/^undefined$/i.test(String(el.textContent || '').trim())) el.textContent = '--';
    });
  }

  function normalizeTargets() {
    if (!dateApi()) return;
    TARGETS.forEach(selector => {
      document.querySelectorAll(selector).forEach(normalizeRoot);
    });
    fixUndefinedReportPills();
  }

  function wrap(name) {
    const old = window[name];
    if (typeof old !== 'function' || old.__haosV786DateCoverage) return;
    const wrapped = function () {
      const result = old.apply(this, arguments);
      setTimeout(normalizeTargets, 40);
      setTimeout(normalizeTargets, 250);
      return result;
    };
    wrapped.__haosV786DateCoverage = true;
    window[name] = wrapped;
  }

  function installWraps() {
    [
      'loadNotifications',
      'loadNotificationCenter',
      'renderEMeetingsV714',
      'openEMeetingDetailV714',
      'renderEMeetingsV715',
      'openEMeetingDetailV715',
      'renderITAssetsV70',
      'renderITRepairTicketsV70',
      'openITAssetDetailV70',
      'openITRepairDetailV70',
      'renderItMinutes',
      'openItMinutesDetail',
      'renderMyReports',
      'renderHeadReports'
    ].forEach(wrap);
  }

  function rerenderReportsOnce() {
    try { if (typeof window.renderMyReports === 'function') window.renderMyReports(); } catch (e) {}
    try { if (typeof window.renderHeadReports === 'function') window.renderHeadReports(); } catch (e) {}
  }

  function install() {
    try {
      window.HAOSDateDisplay && window.HAOSDateDisplay.installCompatibilityGlobals && window.HAOSDateDisplay.installCompatibilityGlobals();
    } catch (e) {}
    installWraps();
    normalizeTargets();
  }

  let queued = false;
  const obs = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      install();
    }, 120);
  });

  window.HAOSDateCoverage = { PATCH, normalizeTargets, replaceDateTokens };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  setTimeout(install, 700);
  setTimeout(() => { install(); rerenderReportsOnce(); }, 1600);
  setTimeout(install, 3200);
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  console.info('HAOS ' + PATCH + ' loaded');
})();
