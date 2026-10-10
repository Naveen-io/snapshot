import test from 'node:test';
import assert from 'node:assert';
import { OrbitStateMachine } from '../state_machine.ts';
import type { OrbitMode, SafetyReleaseReason } from '../../../../../packages/protocol/src/types.ts';

test('State Machine: starts in OFF by default', () => {
  const sm = new OrbitStateMachine();
  assert.strictEqual(sm.mode, 'OFF');
  assert.strictEqual(sm.canAuthorizeInput(), false);
});

test('State Machine: canAuthorizeInput is strictly true only in POINTER mode', () => {
  const modes: OrbitMode[] = ['OFF', 'PREVIEW', 'CALIBRATION', 'PAUSED', 'ERROR'];
  for (const m of modes) {
    const sm = new OrbitStateMachine(m);
    assert.strictEqual(sm.canAuthorizeInput(), false, `Mode ${m} must not authorize input`);
  }

  const armedSm = new OrbitStateMachine('POINTER');
  assert.strictEqual(armedSm.canAuthorizeInput(), true, 'POINTER mode must authorize input');
});

test('State Machine: enforces valid transitions', () => {
  const sm = new OrbitStateMachine('OFF');
  
  // OFF -> PREVIEW is valid
  assert.strictEqual(sm.requestMode('PREVIEW').success, true);
  assert.strictEqual(sm.mode, 'PREVIEW');

  // PREVIEW -> CALIBRATION is valid
  assert.strictEqual(sm.requestMode('CALIBRATION').success, true);
  assert.strictEqual(sm.mode, 'CALIBRATION');

  // CALIBRATION -> POINTER is valid
  assert.strictEqual(sm.requestMode('POINTER').success, true);
  assert.strictEqual(sm.mode, 'POINTER');
  assert.strictEqual(sm.canAuthorizeInput(), true);

  // POINTER -> PAUSED is valid
  assert.strictEqual(sm.requestMode('PAUSED').success, true);
  assert.strictEqual(sm.mode, 'PAUSED');
  assert.strictEqual(sm.canAuthorizeInput(), false);

  // PAUSED -> POINTER is valid
  assert.strictEqual(sm.requestMode('POINTER').success, true);
  assert.strictEqual(sm.mode, 'POINTER');

  // POINTER -> OFF is valid
  assert.strictEqual(sm.requestMode('OFF').success, true);
  assert.strictEqual(sm.mode, 'OFF');
});

test('State Machine: rejects invalid transitions from OFF directly to POINTER', () => {
  const sm = new OrbitStateMachine('OFF');
  const res = sm.requestMode('POINTER');
  assert.strictEqual(res.success, false);
  assert.strictEqual(sm.mode, 'OFF');
});

test('State Machine: emergency stop transitions to PAUSED and fires safety release', () => {
  const sm = new OrbitStateMachine('POINTER');
  let releaseReason: SafetyReleaseReason | null = null;
  sm.onSafetyRelease((reason) => {
    releaseReason = reason;
  });

  sm.emergencyStop();
  assert.strictEqual(sm.mode, 'PAUSED');
  assert.strictEqual(sm.canAuthorizeInput(), false);
  assert.strictEqual(releaseReason, 'emergency_stop');
});

test('State Machine: hand loss in POINTER mode fires tracking_lost safety release', () => {
  const sm = new OrbitStateMachine('POINTER');
  let releaseReason: SafetyReleaseReason | null = null;
  sm.onSafetyRelease((reason) => {
    releaseReason = reason;
  });

  sm.handleHandLoss();
  assert.strictEqual(releaseReason, 'tracking_lost');
});

test('State Machine: exiting POINTER mode triggers safety release', () => {
  const sm = new OrbitStateMachine('POINTER');
  let releaseReason: SafetyReleaseReason | null = null;
  sm.onSafetyRelease((reason) => {
    releaseReason = reason;
  });

  sm.requestMode('OFF');
  assert.strictEqual(releaseReason, 'shutdown');
});
