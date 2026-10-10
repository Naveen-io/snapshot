import test from 'node:test';
import assert from 'node:assert';
import { validateMessage } from './validator.ts';

test('Protocol Validator: accepts valid status message', () => {
  const msg = {
    version: 1,
    type: 'status',
    camera: 'active',
    mode: 'PREVIEW',
    fps: 30.2,
    handDetected: true,
    timestamp: Date.now(),
  };
  const res = validateMessage(msg);
  assert.strictEqual(res.valid, true);
  assert.deepStrictEqual(res.value, msg);
});

test('Protocol Validator: accepts valid pointer_position message', () => {
  const msg = {
    version: 1,
    type: 'pointer_position',
    x: 0.54,
    y: 0.32,
    confidence: 0.95,
    timestamp: Date.now(),
  };
  const res = validateMessage(msg);
  assert.strictEqual(res.valid, true);
});

test('Protocol Validator: rejects out of bounds pointer coordinates', () => {
  const overX = {
    version: 1,
    type: 'pointer_position',
    x: 1.05,
    y: 0.5,
    confidence: 0.9,
    timestamp: Date.now(),
  };
  assert.strictEqual(validateMessage(overX).valid, false);

  const negY = {
    version: 1,
    type: 'pointer_position',
    x: 0.5,
    y: -0.01,
    confidence: 0.9,
    timestamp: Date.now(),
  };
  assert.strictEqual(validateMessage(negY).valid, false);

  const nanCoord = {
    version: 1,
    type: 'pointer_position',
    x: Number.NaN,
    y: 0.5,
    confidence: 0.9,
    timestamp: Date.now(),
  };
  assert.strictEqual(validateMessage(nanCoord).valid, false);

  const infCoord = {
    version: 1,
    type: 'pointer_position',
    x: 0.5,
    y: Number.POSITIVE_INFINITY,
    confidence: 0.9,
    timestamp: Date.now(),
  };
  assert.strictEqual(validateMessage(infCoord).valid, false);
});

test('Protocol Validator: rejects invalid protocol version', () => {
  const msg = {
    version: 2,
    type: 'pointer_position',
    x: 0.5,
    y: 0.5,
    confidence: 0.9,
    timestamp: Date.now(),
  };
  const res = validateMessage(msg);
  assert.strictEqual(res.valid, false);
  assert.match(res.error || '', /Invalid protocol version/);
});

test('Protocol Validator: accepts valid 21 landmarks message', () => {
  const landmarks = Array.from({ length: 21 }, (_, i) => ({
    x: i / 21,
    y: i / 21,
    z: 0.01,
  }));
  const msg = {
    version: 1,
    type: 'landmarks',
    landmarks,
    handedness: 'Right',
    confidence: 0.88,
    timestamp: Date.now(),
  };
  const res = validateMessage(msg);
  assert.strictEqual(res.valid, true);
});

test('Protocol Validator: rejects landmarks array not having exactly 21 points', () => {
  const landmarks = Array.from({ length: 20 }, (_, i) => ({ x: 0, y: 0, z: 0 }));
  const msg = {
    version: 1,
    type: 'landmarks',
    landmarks,
    handedness: 'Right',
    confidence: 0.88,
    timestamp: Date.now(),
  };
  const res = validateMessage(msg);
  assert.strictEqual(res.valid, false);
});

test('Protocol Validator: accepts valid gesture message and validates phases', () => {
  const msg = {
    version: 1,
    type: 'gesture',
    name: 'pinch_left',
    phase: 'start',
    confidence: 0.92,
    timestamp: Date.now(),
  };
  assert.strictEqual(validateMessage(msg).valid, true);

  const invalidGesture = {
    ...msg,
    name: 'fist_strike',
  };
  assert.strictEqual(validateMessage(invalidGesture).valid, false);

  const invalidPhase = {
    ...msg,
    phase: 'explode',
  };
  assert.strictEqual(validateMessage(invalidPhase).valid, false);
});

test('Protocol Validator: accepts valid safety_release and rejects invalid reasons', () => {
  const msg = {
    version: 1,
    type: 'safety_release',
    reason: 'emergency_stop',
    timestamp: Date.now(),
  };
  assert.strictEqual(validateMessage(msg).valid, true);

  const invalidReason = {
    ...msg,
    reason: 'unspecified_vibe',
  };
  assert.strictEqual(validateMessage(invalidReason).valid, false);
});

test('Protocol Validator: accepts control_command and rejects invalid types', () => {
  const msg = {
    version: 1,
    type: 'control_command',
    command: 'SET_MODE',
    payload: { targetMode: 'POINTER' },
    timestamp: Date.now(),
  };
  assert.strictEqual(validateMessage(msg).valid, true);

  const invalidCmd = {
    ...msg,
    command: 'RUN_BASH_SCRIPT',
  };
  assert.strictEqual(validateMessage(invalidCmd).valid, false);
});

test('Protocol Validator: rejects null, primitives, and missing fields', () => {
  assert.strictEqual(validateMessage(null).valid, false);
  assert.strictEqual(validateMessage(undefined).valid, false);
  assert.strictEqual(validateMessage('string').valid, false);
  assert.strictEqual(validateMessage(123).valid, false);
  assert.strictEqual(validateMessage({}).valid, false);
});
