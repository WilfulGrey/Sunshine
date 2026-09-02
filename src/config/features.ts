// Kill switch for the HeldenPlanner (HP) integration.
// true  = normal operation: the pre_arrival/post_arrival/pre_departure callbacks
//         open their HP dialogs and POST confirmations to HP.
// false = HP outage mode: those callbacks still show (as reminders) but we do NOT
//         call confirmPreArrival/PostArrival/PreDeparture. The card shows an amber
//         "confirm manually in HP" banner and 'Odebrała' opens the standard
//         CompletionDialog with an editable prefill instead.
// Flipped to false on 2026-08-07 when HP's API became unstable, back to true on
// 2026-09-01 after they fixed it. Flip again if HP goes down — that is the whole
// change, the outage-mode code stays in place, dormant.
export const HELDENPLANNER_ENABLED = true;

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
