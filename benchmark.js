#!/usr/bin/env node
'use strict';

const bytes = require('./index.js');

// Benchmark configuration
const ITERATIONS = 1000000;

// Common test values
const formatTests = [
  0,
  1024,
  2048,
  4096,
  8192,
  1048576,
  2097152,
  4194304,
  8388608,
  1073741824,
  2147483648,
  4294967296,
  1099511627776,
  // Random values
  1234567,
  987654321,
  12345678901
];

const parseTests = [
  '0',
  '1kb',
  '1KB',
  '1 MB',
  '1GB',
  '1 TB',
  '2kb',
  '4kb',
  '8mb',
  '16gb',
  '100mb',
  '500gb',
  // With spaces
  '1 kb',
  '2 mb',
  '4 gb'
];

function benchmark(name, fn, iterations) {
  // Warmup
  for (let i = 0; i < 1000; i++) {
    fn();
  }

  // Actual benchmark
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();

  const durationMs = Number(end - start) / 1000000;
  const opsPerSec = Math.floor(iterations / (durationMs / 1000));

  console.log(`${name}:`);
  console.log(`  Total time: ${durationMs.toFixed(2)}ms`);
  console.log(`  Operations/sec: ${opsPerSec.toLocaleString()}`);
  console.log(`  Avg time per op: ${(durationMs / iterations * 1000).toFixed(3)}μs`);
  console.log('');

  return durationMs;
}

console.log('=== BYTES.JS BENCHMARK ===\n');
console.log(`Iterations: ${ITERATIONS.toLocaleString()}\n`);

// Format benchmarks
console.log('--- FORMAT BENCHMARKS ---\n');

benchmark('Format: Common values (cached)', () => {
  const val = formatTests[Math.floor(Math.random() * formatTests.length)];
  bytes.format(val);
}, ITERATIONS);

benchmark('Format: Sequential common values', () => {
  for (let i = 0; i < formatTests.length; i++) {
    bytes.format(formatTests[i]);
  }
}, ITERATIONS / formatTests.length);

benchmark('Format: 1KB (most common)', () => {
  bytes.format(1024);
}, ITERATIONS);

benchmark('Format: 1MB (very common)', () => {
  bytes.format(1048576);
}, ITERATIONS);

benchmark('Format: 1GB (very common)', () => {
  bytes.format(1073741824);
}, ITERATIONS);

benchmark('Format: Random values (no cache)', () => {
  bytes.format(Math.floor(Math.random() * 10000000000));
}, ITERATIONS);

benchmark('Format: With options (no cache)', () => {
  bytes.format(1048576, { decimalPlaces: 3 });
}, ITERATIONS / 10);

// Parse benchmarks
console.log('\n--- PARSE BENCHMARKS ---\n');

benchmark('Parse: Common values (cached)', () => {
  const val = parseTests[Math.floor(Math.random() * parseTests.length)];
  bytes.parse(val);
}, ITERATIONS);

benchmark('Parse: Sequential common values', () => {
  for (let i = 0; i < parseTests.length; i++) {
    bytes.parse(parseTests[i]);
  }
}, ITERATIONS / parseTests.length);

benchmark('Parse: "1KB" (most common)', () => {
  bytes.parse('1KB');
}, ITERATIONS);

benchmark('Parse: "1MB" (very common)', () => {
  bytes.parse('1MB');
}, ITERATIONS);

benchmark('Parse: "1GB" (very common)', () => {
  bytes.parse('1GB');
}, ITERATIONS);

benchmark('Parse: Numbers (fast path)', () => {
  bytes.parse(1024);
}, ITERATIONS);

// Combined benchmark
console.log('\n--- COMBINED BENCHMARKS ---\n');

benchmark('Round-trip: format -> parse', () => {
  const formatted = bytes.format(1048576);
  bytes.parse(formatted);
}, ITERATIONS / 2);

console.log('=== BENCHMARK COMPLETE ===');
