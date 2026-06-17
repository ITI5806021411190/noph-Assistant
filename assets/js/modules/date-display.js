(function () {
  'use strict';

  const PATCH = 'v70.85-date-display-standard';
  if (window.__HAOS_V785_DATE_DISPLAY__) return;
  window.__HAOS_V785_DATE_DISPLAY__ = true;

  const monthsFull = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const monthMap = {};

  monthsFull.forEach((name, index) => {
    monthMap[name] = index;
    monthMap[name.replace(/\./g, '')] = index;
  });
  monthsShort.forEach((name, index) => {
    monthMap[name] = index;
    monthMap[name.replace(/\./g, '')] = index;
  });

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function normalizeYear(year) {
    year = Number(year);
    return year > 2400 ? year - 543 : year;
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value)) return value;
    if (typeof value === 'number') {
      const numDate = new Date(value);
      return isNaN(numDate) ? null : numDate;
    }

    const raw = clean(value);
    if (!raw || raw === '-') return null;
    const text = raw.replace(/\u00a0/g, ' ');

    let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2})[:.](\d{2}))?/);
    if (match) {
      return new Date(normalizeYear(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0));
    }

    match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s]+(\d{1,2})[:.](\d{2}))?/);
    if (match) {
      return new Date(normalizeYear(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0));
    }

    match = text.match(/^(\d{1,2})(?:\s*[•/]\s*|\s+)([ก-ฮ.]+)(?:\s*[•/]\s*|\s+)(\d{4})(?:.*?(\d{1,2})[:.](\d{2}))?/);
    if (match) {
      const monthKey = match[2].replace(/\./g, '');
      const month = monthMap[match[2]] ?? monthMap[monthKey];
      if (month != null) {
        return new Date(normalizeYear(match[3]), month, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0));
      }
    }

    const nativeDate = new Date(text.replace(' ', 'T'));
    return isNaN(nativeDate) ? null : nativeDate;
  }

  function hasTime(value) {
    if (value instanceof Date) return value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
    return /(?:T|\s|^)(?:[01]?\d|2[0-3])[:.][0-5]\d/.test(String(value || ''));
  }

  function date(value) {
    const d = parseDate(value);
    if (!d) return clean(value) || '-';
    return `${d.getDate()} • ${monthsFull[d.getMonth()]} • ${d.getFullYear() + 543}`;
  }

  function time(value, raw) {
    const d = parseDate(value);
    if (!d) return '';
    if (!hasTime(raw == null ? value : raw)) return '';
    return `${pad2(d.getHours())}.${pad2(d.getMinutes())} น.`;
  }

  function dateTime(value, options) {
    options = options || {};
    const d = parseDate(value);
    if (!d) return clean(value) || '-';
    const t = time(d, options.forceTime ? d : value);
    return t ? `${date(d)} ${t}` : date(d);
  }

  function timeRange(startValue, endValue) {
    const start = parseDate(startValue);
    const end = parseDate(endValue);
    const startText = start ? time(start, startValue || start) : '';
    const endText = end ? time(end, endValue || end) : '';
    if (startText && endText) return `${startText} ถึง ${endText}`;
    return startText || endText || '';
  }

  function range(startValue, endValue) {
    const start = parseDate(startValue);
    const end = parseDate(endValue);
    if (!start) return clean(startValue) || '-';
    const startDate = date(start);
    const startTime = time(start, startValue || start);
    if (!end) return [startDate, startTime].filter(Boolean).join(' ');
    const sameDay = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();
    const endTime = time(end, endValue || end);
    if (sameDay) return [startDate, startTime, endTime ? `ถึง ${endTime}` : ''].filter(Boolean).join(' ');
    return [startDate, startTime, 'ถึง', date(end), endTime].filter(Boolean).join(' ');
  }

  function dateParts(value) {
    const d = parseDate(value);
    if (!d) {
      const fallback = clean(value) || '-';
      return { day: '-', my: fallback, full: fallback };
    }
    return {
      day: String(d.getDate()).padStart(2, '0'),
      my: `• ${monthsFull[d.getMonth()]} • ${d.getFullYear() + 543}`,
      full: date(d)
    };
  }

  function installCompatibilityGlobals() {
    window.formatThaiDateOnlyV51_ = function (value) { return date(value); };
    window.formatThaiTimeOnlyV51_ = function (value) { return time(value, value) || '-'; };
    window.formatThaiDateTimeV51_ = function (value) { return dateTime(value, { forceTime: true }); };
    window.formatThaiDateTime24_ = function (value) { return dateTime(value, { forceTime: true }); };
    window.formatReportDateThai_ = function (value) { return date(value); };
    window.formatReportDateParts_ = dateParts;
    window.itBookingThaiDate_ = function (value) { return date(value); };
    window.itBookingTimeOnly_ = function (value) { return (time(value, value) || '-').replace(/\s*น\.$/, ''); };
  }

  window.HAOSDateDisplay = {
    PATCH,
    monthsFull,
    parseDate,
    hasTime,
    date,
    time,
    dateTime,
    timeRange,
    range,
    dateParts,
    installCompatibilityGlobals
  };

  window.formatHAOSDateDisplay = window.formatHAOSDateDisplay || date;
  window.formatHAOSTimeDisplay = window.formatHAOSTimeDisplay || time;
  window.formatHAOSDateTimeDisplay = window.formatHAOSDateTimeDisplay || dateTime;
  window.formatHAOSDateTimeRangeDisplay = window.formatHAOSDateTimeRangeDisplay || range;
  installCompatibilityGlobals();

  console.info('HAOS ' + PATCH + ' loaded');
})();
