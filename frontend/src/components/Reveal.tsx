import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in milliseconds (applied via --reveal-delay). */
  delay?: number;
  /** Extra classes forwarded to the wrapper (e.g. layout utilities). */
  className?: string;
  /** Render as a different element tag (default: div). */
  as?: 'div' | 'section' | 'article' | 'li';
}

/**
 * Scroll-entrance wrapper: children rise + rotate in (3D perspective) the
 * first time the element enters the viewport. Purely presentational —
 * disabled automatically under `prefers-reduced-motion` via index.css.
 */
export default function Reveal({ children, delay = 0, className = '', as = 'div' }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Graceful no-JS / old-browser fallback: show immediately.
    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as 'div';
  const style: CSSProperties = delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : {};

  return (
    <Tag ref={ref} className={`reveal ${className}`} style={style}>
      {children}
    </Tag>
  );
}
