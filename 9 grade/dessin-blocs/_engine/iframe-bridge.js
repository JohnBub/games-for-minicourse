// _engine/iframe-bridge.js

export function reportHeight(interactionCode, value) {
  window.parent.postMessage({
    interactionCode,
    type: 'SET_INSTRUCTION_HEIGHT',
    value
  }, '*');
}

export function observeAndReport(interactionCode, element) {
  const send = () => reportHeight(
    interactionCode,
    Math.ceil(element.getBoundingClientRect().height)
  );
  send();
  if (typeof ResizeObserver !== 'undefined' && ResizeObserver) {
    try {
      new ResizeObserver(send).observe(element);
    } catch (_) {
      // ignore — best effort
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('load', send);
  }
}
