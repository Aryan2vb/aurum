import { memo, useEffect, useRef } from 'react';
import Icon from '../../components/atoms/Icon/Icon';
import {
  reconcileTimeline,
  shiftTimelineAnchor,
  timelineAnchorTitle,
} from './reconcileHelpers';

const GRAINS = [
  ['day', 'Day'],
  ['week', 'Week'],
  ['month', 'Month'],
];

const periodEquals = (a, b) => a?.id && b?.id && a.grain === b.grain && a.id === b.id;

const ReconciliationTimeline = ({
  grain,
  onGrainChange,
  anchor,
  onAnchorChange,
  selectedPeriod,
  onSelectPeriod,
  unmatchedLines = [],
  linkedLines = [],
  // legacy props — prefer unmatchedLines / linkedLines
  unmatchedCredits,
  linkedCredits,
}) => {
  const scrollerRef = useRef(null);
  const open = unmatchedLines.length ? unmatchedLines : (unmatchedCredits || []);
  const linked = linkedLines.length ? linkedLines : (linkedCredits || []);
  const cards = reconcileTimeline(grain, anchor, open, linked);
  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const target = root.querySelector('.is-selected') || root.querySelector('.is-today') || root.querySelector('.is-action');
    target?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [grain, anchor, selectedPeriod?.id, cards.length]);

  return (
    <div className="reconcile-timeline">
      <div className="reconcile-grain" role="tablist" aria-label="Timeline scale">
        {GRAINS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={grain === value}
            className={grain === value ? 'is-selected' : ''}
            onClick={() => onGrainChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="reconcile-timeline-nav">
        <button type="button" onClick={() => onAnchorChange(shiftTimelineAnchor(anchor, grain, -1))} aria-label="Previous">
          <Icon name="chevronLeft" size={14} />
        </button>
        <span>{timelineAnchorTitle(anchor, grain)}</span>
        <button type="button" onClick={() => onAnchorChange(shiftTimelineAnchor(anchor, grain, 1))} aria-label="Next">
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
      <span className="reconcile-timeline-rule" />
      <button
        type="button"
        className={`reconcile-chip${!selectedPeriod ? ' is-selected' : ''}`}
        onClick={() => onSelectPeriod(null)}
      >
        All
      </button>
      <div className="reconcile-timeline-days" ref={scrollerRef}>
        {cards.map((card) => {
          const selected = periodEquals(selectedPeriod, card);
          const isToday = todayKey >= card.start && todayKey <= card.end;
          return (
            <button
              key={card.id}
              type="button"
              className={[
                'reconcile-chip',
                `is-${grain}`,
                `is-${card.status}`,
                selected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectPeriod(selected ? null : card)}
              title={
                card.status === 'action'
                  ? `${card.label} · ${card.unmatchedCount} unmatched`
                  : card.status === 'done'
                    ? `${card.label} · fully reconciled`
                    : `${card.label} · no statement lines`
              }
            >
              {card.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default memo(ReconciliationTimeline);
