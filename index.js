/*!
 * bytes
 * Copyright(c) 2012-2014 TJ Holowaychuk
 * Copyright(c) 2015 Jed Watson
 * MIT Licensed
 */

'use strict';

/**
 * Module exports.
 * @public
 */

module.exports = bytes;
module.exports.format = format;
module.exports.parse = parse;

/**
 * Module variables.
 * @private
 */

var formatThousandsRegExp = /\B(?=(\d{3})+(?!\d))/g;

var formatDecimalsRegExp = /(?:\.0*|(\.[^0]+)0+)$/;

var map = {
  b:  1,
  kb: 1 << 10,
  mb: 1 << 20,
  gb: 1 << 30,
  tb: Math.pow(1024, 4),
  pb: Math.pow(1024, 5),
};

var parseRegExp = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i;

/**
 * Optimization: Format cache for common byte values
 * @private
 */
var formatCache = new Map();

/**
 * Optimization: Common byte values for fast path lookups
 * @private
 */
var commonValues = [
  { bytes: 0, str: '0B' },
  { bytes: 1024, str: '1KB' },
  { bytes: 2048, str: '2KB' },
  { bytes: 4096, str: '4KB' },
  { bytes: 8192, str: '8KB' },
  { bytes: 1048576, str: '1MB' },
  { bytes: 2097152, str: '2MB' },
  { bytes: 4194304, str: '4MB' },
  { bytes: 8388608, str: '8MB' },
  { bytes: 16777216, str: '16MB' },
  { bytes: 33554432, str: '32MB' },
  { bytes: 67108864, str: '64MB' },
  { bytes: 134217728, str: '128MB' },
  { bytes: 268435456, str: '256MB' },
  { bytes: 536870912, str: '512MB' },
  { bytes: 1073741824, str: '1GB' },
  { bytes: 2147483648, str: '2GB' },
  { bytes: 4294967296, str: '4GB' },
  { bytes: 8589934592, str: '8GB' },
  { bytes: 17179869184, str: '16GB' },
  { bytes: 34359738368, str: '32GB' },
  { bytes: 68719476736, str: '64GB' },
  { bytes: 137438953472, str: '128GB' },
  { bytes: 274877906944, str: '256GB' },
  { bytes: 549755813888, str: '512GB' },
  { bytes: 1099511627776, str: '1TB' },
  { bytes: 2199023255552, str: '2TB' },
  { bytes: 4398046511104, str: '4TB' },
  { bytes: 8796093022208, str: '8TB' }
];

/**
 * Optimization: Lookup table for common values
 * @private
 */
var commonLookup = {};
for (var i = 0; i < commonValues.length; i++) {
  commonLookup[commonValues[i].bytes] = commonValues[i].str;
}

/**
 * Optimization: Unit thresholds for fast path detection
 * @private
 */
var unitThresholds = [
  { threshold: map.pb, unit: 'PB', divisor: map.pb },
  { threshold: map.tb, unit: 'TB', divisor: map.tb },
  { threshold: map.gb, unit: 'GB', divisor: map.gb },
  { threshold: map.mb, unit: 'MB', divisor: map.mb },
  { threshold: map.kb, unit: 'KB', divisor: map.kb },
  { threshold: 0, unit: 'B', divisor: 1 }
];

/**
 * Optimization: Parse cache for common string values
 * @private
 */
var parseCache = new Map();
var parseCacheCommon = {
  '0': 0,
  '1kb': 1024,
  '1mb': 1048576,
  '1gb': 1073741824,
  '1tb': 1099511627776,
  '2kb': 2048,
  '4kb': 4096,
  '8kb': 8192,
  '16kb': 16384,
  '32kb': 32768,
  '64kb': 65536,
  '128kb': 131072,
  '256kb': 262144,
  '512kb': 524288,
  '1024kb': 1048576,
  '2mb': 2097152,
  '4mb': 4194304,
  '8mb': 8388608,
  '16mb': 16777216,
  '32mb': 33554432,
  '64mb': 67108864,
  '128mb': 134217728,
  '256mb': 268435456,
  '512mb': 536870912,
  '2gb': 2147483648,
  '4gb': 4294967296,
  '8gb': 8589934592,
  '16gb': 17179869184,
  '32gb': 34359738368,
  '64gb': 68719476736,
  '128gb': 137438953472,
  '256gb': 274877906944,
  '512gb': 549755813888,
  '2tb': 2199023255552,
  '4tb': 4398046511104,
  '8tb': 8796093022208
};

/**
 * Convert the given value in bytes into a string or parse to string to an integer in bytes.
 *
 * @param {string|number} value
 * @param {{
 *  case: [string],
 *  decimalPlaces: [number]
 *  fixedDecimals: [boolean]
 *  thousandsSeparator: [string]
 *  unitSeparator: [string]
 *  }} [options] bytes options.
 *
 * @returns {string|number|null}
 */

function bytes(value, options) {
  if (typeof value === 'string') {
    return parse(value);
  }

  if (typeof value === 'number') {
    return format(value, options);
  }

  return null;
}

/**
 * Format the given value in bytes into a string.
 *
 * If the value is negative, it is kept as such. If it is a float,
 * it is rounded.
 *
 * @param {number} value
 * @param {object} [options]
 * @param {number} [options.decimalPlaces=2]
 * @param {number} [options.fixedDecimals=false]
 * @param {string} [options.thousandsSeparator=]
 * @param {string} [options.unit=]
 * @param {string} [options.unitSeparator=]
 *
 * @returns {string|null}
 * @public
 */

function format(value, options) {
  if (!Number.isFinite(value)) {
    return null;
  }

  // Optimization: Fast path for default options (most common case)
  if (!options) {
    // Check common lookup table
    var cached = commonLookup[value];
    if (cached !== undefined) {
      return cached;
    }

    // Check format cache
    cached = formatCache.get(value);
    if (cached !== undefined) {
      return cached;
    }
  }

  var mag = Math.abs(value);
  var thousandsSeparator = (options && options.thousandsSeparator) || '';
  var unitSeparator = (options && options.unitSeparator) || '';
  var decimalPlaces = (options && options.decimalPlaces !== undefined) ? options.decimalPlaces : 2;
  var fixedDecimals = Boolean(options && options.fixedDecimals);
  var unit = (options && options.unit) || '';

  // Optimization: Fast path unit detection using lookup table
  if (!unit || !map[unit.toLowerCase()]) {
    // Use threshold lookup for faster detection
    for (var i = 0; i < unitThresholds.length; i++) {
      if (mag >= unitThresholds[i].threshold) {
        unit = unitThresholds[i].unit;
        break;
      }
    }
  }

  var val = value / map[unit.toLowerCase()];
  var str = val.toFixed(decimalPlaces);

  if (!fixedDecimals) {
    str = str.replace(formatDecimalsRegExp, '$1');
  }

  if (thousandsSeparator) {
    str = str.split('.').map(function (s, i) {
      return i === 0
        ? s.replace(formatThousandsRegExp, thousandsSeparator)
        : s
    }).join('.');
  }

  var result = str + unitSeparator + unit;

  // Optimization: Cache result for default options
  if (!options && formatCache.size < 1000) {
    formatCache.set(value, result);
  }

  return result;
}

/**
 * Parse the string value into an integer in bytes.
 *
 * If no unit is given, it is assumed the value is in bytes.
 *
 * @param {number|string} val
 *
 * @returns {number|null}
 * @public
 */

function parse(val) {
  if (typeof val === 'number' && !isNaN(val)) {
    return val;
  }

  if (typeof val !== 'string') {
    return null;
  }

  // Optimization: Fast path for common string values
  var normalized = val.toLowerCase().replace(/\s+/g, '');
  var commonResult = parseCacheCommon[normalized];
  if (commonResult !== undefined) {
    return commonResult;
  }

  // Optimization: Check parse cache
  var cachedResult = parseCache.get(normalized);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  // Test if the string passed is valid
  var results = parseRegExp.exec(val);
  var floatValue;
  var unit = 'b';

  if (!results) {
    // Nothing could be extracted from the given string
    floatValue = parseInt(val, 10);
    unit = 'b'
  } else {
    // Retrieve the value and the unit
    floatValue = parseFloat(results[1]);
    unit = results[4].toLowerCase();
  }

  if (isNaN(floatValue)) {
    return null;
  }

  var result = Math.floor(map[unit] * floatValue);

  // Optimization: Cache the parse result (limit cache size)
  if (parseCache.size < 1000) {
    parseCache.set(normalized, result);
  }

  return result;
}
