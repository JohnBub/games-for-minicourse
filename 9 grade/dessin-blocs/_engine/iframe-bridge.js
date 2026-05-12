// _engine/iframe-bridge.js

export function reportHeight(interactionCode, value) {
  window.parent.postMessage({
    interactionCode,
    type: 'SET_INSTRUCTION_HEIGHT',
    value
  }, '*');
}

// Returns `reportNow` so callers can explicitly trigger a height report
// after content mutations (rerender, paintCanvas, showFeedback, animation
// end). Without this, older webviews lacking ResizeObserver only ever see
// the initial load-time height and clip newly added content.
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
  return { reportNow: send };
}
