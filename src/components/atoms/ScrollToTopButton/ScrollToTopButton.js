import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../Icon/Icon';
import './ScrollToTopButton.css';

/** The element, and every ancestor, that is currently scrolled down (the page may scroll instead of the table). */
const scrolledAncestors = (el) => {
  const found = [];
  for (let node = el; node; node = node.parentElement) {
    if (node.scrollTop > 0) found.push(node);
  }
  const root = document.scrollingElement;
  if (root && root.scrollTop > 0) found.push(root);
  return found;
};

/**
 * Floating "back to top" button. `targetRef` is any element inside the scrollable area —
 * whichever of it or its ancestors actually scrolls is tracked and scrolled.
 */
const ScrollToTopButton = ({ targetRef, threshold = 300 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // scroll doesn't bubble, so listen in the capture phase and ignore unrelated scrollers.
    const onScroll = (event) => {
      const el = targetRef.current;
      const source = event.target === document ? document.scrollingElement : event.target;
      if (!el || !source || !(source === el || source.contains?.(el))) return;
      setVisible(scrolledAncestors(el).some((node) => node.scrollTop > threshold));
    };
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [targetRef, threshold]);

  const scrollToTop = useCallback(() => {
    scrolledAncestors(targetRef.current).forEach((node) => node.scrollTo({ top: 0, behavior: 'smooth' }));
  }, [targetRef]);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-top-btn"
      aria-label="Scroll to top"
      title="Back to top"
      onClick={scrollToTop}
    >
      <Icon name="chevronUp" size={18} />
    </button>
  );
};

export default ScrollToTopButton;
