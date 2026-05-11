import type { Session, Drill, SessionSection } from '@/types';

export type WarnLevel = 'error' | 'warning' | 'info';

export interface SessionIssue {
  level: WarnLevel;
  title: string;
  detail?: string;
}

export function analyzeSession(session: Session, drills: Record<string, Drill>): SessionIssue[] {
  if (session.blocks.length === 0) return [];

  const issues: SessionIssue[] = [];
  const totalMin = session.blocks.reduce((s, b) => s + b.durationMin, 0);
  const hasSections = session.blocks.some((b) => b.section);
  const sections = new Set(
    session.blocks.map((b) => b.section).filter((s): s is SessionSection => !!s)
  );

  // Missing drills
  const missing = session.blocks.filter((b) => !drills[b.drillId]).length;
  if (missing > 0) {
    issues.push({
      level: 'error',
      title: `${missing} drill${missing !== 1 ? 's' : ''} not found`,
      detail: 'Some blocks reference drills that have been deleted. Remove or replace them.',
    });
  }

  // Duration checks
  if (totalMin < 30) {
    issues.push({
      level: 'warning',
      title: `Short session — ${totalMin} min`,
      detail: 'Most training sessions run 45–90 minutes. Consider adding more drills.',
    });
  } else if (totalMin > 120) {
    issues.push({
      level: 'warning',
      title: `Very long session — ${totalMin} min`,
      detail: 'Sessions over 2 hours risk fatigue and reduced engagement. Consider splitting or removing a block.',
    });
  }

  // Phase checks
  if (hasSections && !sections.has('warmup')) {
    issues.push({
      level: 'warning',
      title: 'No warm-up phase',
      detail: 'A warm-up prepares players physically and mentally, and reduces injury risk.',
    });
  }
  if (hasSections && !sections.has('cooldown')) {
    issues.push({
      level: 'info',
      title: 'No cool-down phase',
      detail: 'A cool-down helps with recovery and is a good time for team debrief and reflection.',
    });
  }

  // Consecutive high-intensity blocks
  let maxConsec = 0;
  let consec = 0;
  for (const b of session.blocks) {
    if (b.intensity === 'high') { consec++; maxConsec = Math.max(maxConsec, consec); }
    else consec = 0;
  }
  if (maxConsec >= 3) {
    issues.push({
      level: 'warning',
      title: `${maxConsec} high-intensity blocks in a row`,
      detail: 'Insert lower-intensity work to manage cumulative fatigue and keep players sharp.',
    });
  }

  // Intensity distribution
  const intCounts = { low: 0, mid: 0, high: 0 };
  session.blocks.forEach((b) => intCounts[b.intensity]++);
  const n = session.blocks.length;
  if (n >= 3) {
    if (intCounts.high === n) {
      issues.push({
        level: 'warning',
        title: 'All blocks are high intensity',
        detail: 'No recovery opportunity. Add low or mid-intensity work to manage load.',
      });
    } else if (intCounts.low === n) {
      issues.push({
        level: 'info',
        title: 'All blocks are low intensity',
        detail: 'Consider whether you need any mid or high-intensity work in this session.',
      });
    } else if (intCounts.mid === n) {
      issues.push({
        level: 'info',
        title: 'No intensity variation',
        detail: 'Varying intensity helps manage player load and maintain engagement throughout.',
      });
    }
  }

  // Unassigned phases when sections are in use
  if (hasSections) {
    const unassigned = session.blocks.filter((b) => !b.section).length;
    if (unassigned > 0) {
      issues.push({
        level: 'info',
        title: `${unassigned} block${unassigned !== 1 ? 's' : ''} without a phase`,
        detail: 'Assign phases (Warm-up, Main, etc.) to all blocks for clearer session structure.',
      });
    }
  }

  return issues;
}
