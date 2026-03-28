import { describe, expect, it } from 'vitest';
import {
  createAppointmentSchema,
  createProposalSchema,
  updateAppointmentSchema,
} from './appointment.js';

describe('appointment validation chronology', () => {
  it('rejects appointment creation when end is before start', () => {
    const result = createAppointmentSchema.safeParse({
      ticketId: '123e4567-e89b-12d3-a456-426614174000',
      scheduledStart: '2026-03-26T15:00:00Z',
      scheduledEnd: '2026-03-26T14:00:00Z',
      travelBuffer: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects appointment updates when provided end is before provided start', () => {
    const result = updateAppointmentSchema.safeParse({
      scheduledStart: '2026-03-26T15:00:00Z',
      scheduledEnd: '2026-03-26T14:00:00Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects proposal creation when end is before start', () => {
    const result = createProposalSchema.safeParse({
      ticketId: '123e4567-e89b-12d3-a456-426614174000',
      proposedStart: '2026-03-26T15:00:00Z',
      proposedEnd: '2026-03-26T14:00:00Z',
    });

    expect(result.success).toBe(false);
  });
});
