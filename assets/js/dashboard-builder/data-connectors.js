(function () {
  'use strict';

  const FORMULA_PREFIX = /^[=+\-@]/;
  const MAX_PREVIEW = 500;
  const MAX_ROWS = 20000;
  const MAX_FILE_BYTES = 15 * 1024 * 1024;

  function cleanCell(value) {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString();
    const text = String(value).replace(/\u0000/g, '').trim();
    return FORMULA_PREFIX.test(text) ? "'" + text : text;
  }

  function uniqueHeaders(values) {
    const used = Object.create(null);
    return values.map((value, index) => {
      const base = cleanCell(value) || `คอลัมน์ ${index + 1}`;
      used[base] = (used[base] || 0) + 1;
      return used[base] === 1 ? base : `${base} (${used[base]})`;
    });
  }

  function normalizeMatrix(matrix, headerRow) {
    const start = Math.max(0, Number(headerRow || 1) - 1);
    const header = uniqueHeaders(matrix[start] || []);
    const rows = matrix.slice(start + 1, start + 1 + MAX_ROWS).map(row => {
      const out = {};
      header.forEach((name, index) => { out[name] = cleanCell(row[index]); });
      return out;
    }).filter(row => Object.values(row).some(value => value !== ''));
    return { header, rows, truncated: matrix.length - start - 1 > MAX_ROWS };
  }

  function inferValueType(values) {
    const actual = values.filter(value => value !== '' && value != null);
    if (!actual.length) return 'Text';
    if (actual.every(value => /^(true|false|yes|no|0|1)$/i.test(String(value)))) return 'Boolean';
    if (actual.every(value => /^[-+]?\d+$/.test(String(value).replace(/,/g, '')))) return 'Integer';
    if (actual.every(value => /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(String(value).replace(/,/g, '')))) return 'Decimal';
    const dateLike = actual.filter(value => /[\-/.]/.test(String(value)) && Number.isFinite(Date.parse(String(value)))).length;
    if (dateLike / actual.length >= 0.85) return actual.some(value => /\d{1,2}:\d{2}/.test(String(value))) ? 'DateTime' : 'Date';
    const distinct = new Set(actual.map(String)).size;
    if (distinct <= Math.min(30, Math.max(2, Math.floor(actual.length * 0.8)))) return 'Category';
    return 'Text';
  }

  function buildSchema(rows, headers) {
    return headers.map((name, index) => {
      const values = rows.slice(0, MAX_PREVIEW).map(row => row[name]);
      const actual = values.filter(value => value !== '' && value != null);
      const type = inferValueType(values);
      const invalid = type === 'Integer' || type === 'Decimal'
        ? actual.filter(value => !Number.isFinite(Number(String(value).replace(/,/g, '')))).length : 0;
      return { id:`col_${index + 1}`, sourceName:name, name, type, enabled:true,
        nullCount:values.length - actual.length, uniqueCount:new Set(actual.map(String)).size,
        invalidCount:invalid, dateFormat:'thai-long', decimals:type === 'Decimal' ? 2 : 0 };
    });
  }

  async function parseFile(file, headerRow) {
    if (!file) throw new Error('กรุณาเลือกไฟล์ข้อมูล');
    if (file.size > MAX_FILE_BYTES) throw new Error('ไฟล์ใหญ่เกิน 15 MB สำหรับ Dashboard Builder รุ่นนี้');
    if (!window.XLSX) throw new Error('ยังโหลดตัวอ่าน Excel ไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่');
    if (!/\.(csv|xlsx|xls)$/i.test(file.name || '')) throw new Error('รองรับเฉพาะ CSV, XLSX และ XLS');
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type:'array', cellDates:true, raw:false });
    return { fileName:file.name, workbook, sheetNames:workbook.SheetNames.slice(),
      readSheet(sheetName, selectedHeaderRow) {
        const chosen = sheetName || workbook.SheetNames[0];
        const matrix = window.XLSX.utils.sheet_to_json(workbook.Sheets[chosen], { header:1, defval:'', raw:false });
        const normalized = normalizeMatrix(matrix, selectedHeaderRow || headerRow || 1);
        return { ...normalized, schema:buildSchema(normalized.rows, normalized.header), sheetName:chosen };
      }
    };
  }

  function applySchema(rows, schema) {
    const active = schema.filter(column => column.enabled);
    return rows.map(row => {
      const out = {};
      active.forEach(column => {
        const raw = row[column.sourceName];
        if (column.type === 'Integer') out[column.name] = raw === '' ? '' : parseInt(String(raw).replace(/,/g, ''), 10);
        else if (column.type === 'Number' || column.type === 'Decimal') out[column.name] = raw === '' ? '' : Number(String(raw).replace(/,/g, ''));
        else if (column.type === 'Boolean') out[column.name] = /^(true|yes|1)$/i.test(String(raw));
        else out[column.name] = cleanCell(raw);
      });
      return out;
    });
  }

  window.HAOSDashboardData = { MAX_PREVIEW, MAX_ROWS, MAX_FILE_BYTES, cleanCell, normalizeMatrix, buildSchema, parseFile, applySchema };
})();
