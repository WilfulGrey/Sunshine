import { describe, it, expect } from 'vitest';
import { convertCallbackToTask } from './sunshineHelpers';
import { SunshineCallback } from '../services/sunshineService';

// titleForType is private on purpose — exercise it through the public converter
// rather than widening the module's surface just for a test.
const makeCallback = (overrides: Partial<SunshineCallback> = {}): SunshineCallback => ({
  callback_id: 2678,
  caregiver_id: 10589,
  callback_at: '2026-10-02T08:00:00.000000Z',
  employee_id: null,
  first_name: 'Anna',
  last_name: 'Nowak',
  phone_number: '+48123456789',
  latest_contact_content: null,
  callback_source: 'System',
  recruiter_name: null,
  status: 'Aktywna',
  ...overrides,
});

describe('convertCallbackToTask — survey callbacks', () => {
  it('titles a survey callback "<name> - Ankieta"', () => {
    const task = convertCallbackToTask(makeCallback({ type: 'survey' }));

    expect(task.title).toBe('Anna Nowak - Ankieta');
  });

  it('carries the survey type through to apiData so the card can route on it', () => {
    const task = convertCallbackToTask(makeCallback({ type: 'survey' }));

    expect(task.apiData?.callbackType).toBe('survey');
    expect(task.apiData?.callbackId).toBe(2678);
  });

  it('maps the survey link from the list payload into apiData', () => {
    const task = convertCallbackToTask(
      makeCallback({ type: 'survey', link: 'https://beta.mamamia.app/caregiver-agency/add-survey/33387' })
    );

    expect(task.apiData?.link).toBe('https://beta.mamamia.app/caregiver-agency/add-survey/33387');
  });

  it('leaves apiData.link undefined when the backend omits it', () => {
    const task = convertCallbackToTask(makeCallback({ type: 'survey' }));

    expect(task.apiData?.link).toBeUndefined();
  });

  it('still falls back to the phone-contact title for untyped callbacks', () => {
    const task = convertCallbackToTask(makeCallback({ type: undefined }));

    expect(task.title).toBe('Anna Nowak - Kontakt telefoniczny');
    expect(task.apiData?.callbackType).toBe('general');
  });
});
