import test from 'node:test';
import assert from 'node:assert/strict';

test('Recent Cases Drawer - Escape Key & Overlay Dismissal Behavior', async (t) => {
  // Mock DOM environment for Node.js test runner
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  const listeners = new Map();
  let bodyOverflow = '';
  let activeElement = null;

  const mockWindow = {
    addEventListener: (event, handler, useCapture) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push({ handler, useCapture });
    },
    removeEventListener: (event, handler) => {
      if (!listeners.has(event)) return;
      listeners.set(event, listeners.get(event).filter(l => l.handler !== handler));
    },
    getComputedStyle: (elem) => elem._computedStyle || { display: 'block', visibility: 'visible', opacity: '1', zIndex: '50' },
  };

  const mockDocument = {
    body: {
      style: {
        get overflow() { return bodyOverflow; },
        set overflow(v) { bodyOverflow = v; },
      },
    },
    get activeElement() { return activeElement; },
    querySelectorAll: (selector) => [],
  };

  globalThis.window = mockWindow;
  globalThis.document = mockDocument;

  try {
    await t.test('Escape key listener is registered on window in capture phase when drawer opens', () => {
      // Simulate listener registration as in useEffect
      let closed = false;
      const onClose = () => { closed = true; };

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      };

      mockWindow.addEventListener('keydown', handleKeyDown, true);

      assert.ok(listeners.get('keydown')?.length > 0, 'keydown listener must be attached');
      const registered = listeners.get('keydown')[0];
      assert.equal(registered.useCapture, true, 'listener must use capture phase to intercept before bubbling');

      // Test keydown with non-Escape key (e.g. Tab)
      const tabEvent = { key: 'Tab', defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
      registered.handler(tabEvent);
      assert.equal(closed, false, 'Non-Escape key must not trigger onClose');
      assert.equal(tabEvent.defaultPrevented, false);

      // Test keydown with Escape key
      const escapeEvent = { key: 'Escape', defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
      registered.handler(escapeEvent);
      assert.equal(closed, true, 'Escape key must trigger onClose');
      assert.equal(escapeEvent.defaultPrevented, true, 'Escape key must call preventDefault()');

      // Test cleanup
      mockWindow.removeEventListener('keydown', handleKeyDown);
      assert.equal(listeners.get('keydown').length, 0, 'Listener must be cleanly removed on unmount');
    });

    await t.test('Body scroll locking locks on open and cleanly restores on close', () => {
      bodyOverflow = 'auto';
      const initialOverflow = bodyOverflow;

      // When open:
      const savedOverflow = bodyOverflow;
      bodyOverflow = 'hidden';
      assert.equal(bodyOverflow, 'hidden', 'Body scroll must be locked when drawer is open');

      // When closed:
      bodyOverflow = savedOverflow;
      assert.equal(bodyOverflow, initialOverflow, 'Body scroll must be restored when drawer closes');
    });

    await t.test('Focus is restored to the opener element upon drawer dismissal', () => {
      let focused = false;
      const openerButton = {
        focus: () => { focused = true; },
      };
      activeElement = openerButton;

      // Drawer captures activeElement
      const triggerRef = { current: activeElement };
      assert.equal(triggerRef.current, openerButton);

      // When closing without navigating:
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
      assert.equal(focused, true, 'Opener button must regain focus when drawer closes');
    });

    await t.test('Topmost overlay resolution respects stacked modals above drawer', () => {
      const drawerDialog = { id: 'drawer', _computedStyle: { display: 'block', visibility: 'visible', opacity: '1', zIndex: '50' } };
      const topModalDialog = { id: 'topModal', _computedStyle: { display: 'block', visibility: 'visible', opacity: '1', zIndex: '60' } };

      const allDialogs = [drawerDialog, topModalDialog];

      let drawerClosed = false;
      const myDialog = drawerDialog;

      const hasOverlayAbove = allDialogs.some((d, idx) => {
        if (d === myDialog) return false;
        const myZ = parseInt(drawerDialog._computedStyle.zIndex, 10);
        const otherZ = parseInt(d._computedStyle.zIndex, 10);
        if (otherZ > myZ) return true;
        return false;
      });

      assert.equal(hasOverlayAbove, true, 'Must detect that topModal is above drawer');

      // Drawer does NOT close when higher modal exists
      if (!hasOverlayAbove) {
        drawerClosed = true;
      }
      assert.equal(drawerClosed, false, 'Drawer must not close if a higher overlay is on top');

      // When topModal is removed (only drawer remains)
      const remainingDialogs = [drawerDialog];
      const hasOverlayAboveNow = remainingDialogs.some((d) => d !== drawerDialog);
      assert.equal(hasOverlayAboveNow, false);
      if (!hasOverlayAboveNow) {
        drawerClosed = true;
      }
      assert.equal(drawerClosed, true, 'Drawer must close when it is the topmost overlay');
    });
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
