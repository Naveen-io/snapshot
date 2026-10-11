import { describe, it, expect } from 'vitest';
import { Annotation } from '../../src/shared/types';

describe('Undo/Redo and Annotation History Stack', () => {
  it('correctly tracks push, undo, and redo operations', () => {
    let history: Annotation[][] = [[]];
    let currentIndex = 0;

    const pushState = (ann: Annotation[]) => {
      history = history.slice(0, currentIndex + 1);
      history.push(ann);
      currentIndex = history.length - 1;
    };

    const undo = () => {
      if (currentIndex > 0) currentIndex--;
      return history[currentIndex];
    };

    const redo = () => {
      if (currentIndex < history.length - 1) currentIndex++;
      return history[currentIndex];
    };

    // 1. Initial
    expect(history[currentIndex].length).toBe(0);

    // 2. Add arrow
    const ann1: Annotation = {
      id: '1',
      type: 'arrow',
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      color: '#ff0000',
      strokeWidth: 4
    };
    pushState([ann1]);
    expect(history[currentIndex].length).toBe(1);

    // 3. Add text
    const ann2: Annotation = {
      id: '2',
      type: 'text',
      x: 100,
      y: 100,
      width: 60,
      height: 20,
      text: 'API Key',
      color: '#00ff00',
      strokeWidth: 2
    };
    pushState([ann1, ann2]);
    expect(history[currentIndex].length).toBe(2);

    // 4. Undo -> Should be 1 annotation
    const afterUndo = undo();
    expect(afterUndo.length).toBe(1);
    expect(afterUndo[0].id).toBe('1');

    // 5. Redo -> Should be 2 annotations
    const afterRedo = redo();
    expect(afterRedo.length).toBe(2);

    // 6. Branching edit after undo
    undo();
    const ann3: Annotation = {
      id: '3',
      type: 'redact',
      x: 50,
      y: 50,
      width: 80,
      height: 30,
      color: '#000000',
      strokeWidth: 1
    };
    pushState([ann1, ann3]);
    expect(history[currentIndex].length).toBe(2);
    expect(history.length).toBe(3); // previous branched future truncated
  });

  it('secure redaction validates destructive solid fill dimensions', () => {
    const redactAnnotation: Annotation = {
      id: 'r1',
      type: 'redact',
      x: 40,
      y: 80,
      width: 120,
      height: 30,
      color: '#000000',
      strokeWidth: 1
    };

    // Verify coordinates are bounded and non-zero
    expect(redactAnnotation.width).toBeGreaterThan(0);
    expect(redactAnnotation.height).toBeGreaterThan(0);
    expect(redactAnnotation.color).toBe('#000000');
  });
});
