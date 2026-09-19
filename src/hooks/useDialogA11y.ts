import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Every role="dialog" in this app reimplemented Escape-to-close, initial focus, and
 * focus return independently, with none of them trapping Tab -- so a keyboard user
 * could tab straight out of an open dialog into the page behind it, which the
 * WAI-ARIA modal-dialog pattern treats as inert while the dialog is open.
 *
 * `isOpen` is required (not inferred from mount/unmount) because some callers guard
 * their dialog markup with an early `if (!isOpen) return null`, which happens after
 * hooks must already have been called -- so this hook has to be callable
 * unconditionally on every render and no-op itself while closed.
 */
export function useDialogA11y(
  isOpen: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLElement | null>,
  /**
   * Where to send focus back to on close. Defaults to whatever had focus right
   * before the dialog opened (correct for a dialog opened from a varying row/list
   * button). Pass a fixed ref instead for a dialog whose trigger is a single
   * persistent control (e.g. a header icon button) rather than "whatever was
   * clicked" -- most reliable there since focus-on-click isn't guaranteed to have
   * already landed on the trigger by the time this effect runs.
   */
  restoreFocusRef?: React.RefObject<HTMLElement | null>
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const getFocusable = () =>
      container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];

    if (container && !container.contains(document.activeElement)) {
      (getFocusable()[0] || container).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      (restoreFocusRef?.current || previouslyFocused.current)?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
