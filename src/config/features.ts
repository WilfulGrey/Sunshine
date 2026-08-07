// HeldenPlanner (HP) API temporarily disabled — their API became unstable and
// they asked us to stop calling it and confirm manually in the HP system.
// While false: the pre_arrival/post_arrival/pre_departure callbacks still show
// (as reminders) but we do NOT call confirmPreArrival/PostArrival/PreDeparture.
// Flip back to true when HP is stable again — the HP dialogs and confirm
// handlers stay in the code, dormant.
export const HELDENPLANNER_ENABLED = false;

export const HP_PROCESS_TYPES = ['pre_arrival', 'post_arrival', 'pre_departure'] as const;

export const isHpProcessType = (t?: string): boolean =>
  !!t && (HP_PROCESS_TYPES as readonly string[]).includes(t);

// Editable prefill for the CompletionDialog when a recruiter handles one of the
// HP process callbacks while HP is off (they confirm in HP by hand, this note
// records it in the caregiver history).
export const hpPrefillNote = (t?: string): string => {
  switch (t) {
    case 'pre_arrival': return 'Potwierdzono przyjazd ręcznie w HeldenPlanner';
    case 'post_arrival': return 'Potwierdzono pobyt ręcznie w HeldenPlanner';
    case 'pre_departure': return 'Potwierdzono wyjazd ręcznie w HeldenPlanner';
    default: return '';
  }
};
