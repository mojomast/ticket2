/**
 * scheduling.service.test.ts
 * Tests for availability calculation and booking conflict detection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma using vi.hoisted ───
const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      ticket: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      appointment: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import {
  getAvailability,
  createAppointment,
  getAppointments,
  getDaySchedule,
  cancelAppointment,
} from './scheduling.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ permissions: null });
});

// ─── getAvailability Tests ───
describe('getAvailability', () => {
  it('returns 30-min slots from 08:00 to 18:00 with default 60-min duration', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);

    const slots = await getAvailability('2026-03-26');

    // With 60-min duration and 30-min intervals from 08:00 to 18:00,
    // last slot starts at 17:00 (ends at 18:00)
    // Slots: 08:00, 08:30, 09:00, ..., 17:00 = ((17-8)*2 + 1) = 19 slots
    expect(slots.length).toBe(19);

    // Check first slot
    expect(slots[0].start).toContain('T08:00:00');
    expect(slots[0].available).toBe(true);

    // Check last slot starts at 17:00
    expect(slots[slots.length - 1].start).toContain('T17:00:00');
  });

  it('marks slots as unavailable when they conflict with existing appointments', async () => {
    // Existing appointment from 10:00 to 11:00 with no travel buffer
    mockPrisma.appointment.findMany.mockResolvedValue([
      {
        scheduledStart: new Date('2026-03-26T10:00:00'),
        scheduledEnd: new Date('2026-03-26T11:00:00'),
        travelBuffer: 0,
        technicianId: 'tech-1',
      },
    ]);

    const slots = await getAvailability('2026-03-26', 'tech-1');

    // Slots at 10:00 and 10:30 should be unavailable
    const slot1000 = slots.find((s) => s.start.includes('T10:00:00'));
    const slot1030 = slots.find((s) => s.start.includes('T10:30:00'));
    const slot0930 = slots.find((s) => s.start.includes('T09:30:00'));

    expect(slot1000?.available).toBe(false);
    expect(slot1030?.available).toBe(false);
    // 09:30 slot (09:30-10:30) overlaps with 10:00-11:00 so unavailable
    expect(slot0930?.available).toBe(false);

    // 08:00 slot (08:00-09:00) should be available
    const slot0800 = slots.find((s) => s.start.includes('T08:00:00'));
    expect(slot0800?.available).toBe(true);
  });

  it('subtracts travel buffer from appointment start for conflict detection', async () => {
    // Existing appointment from 10:00 to 11:00 with 30-min travel buffer
    // Effective conflict window: 09:30 to 11:00
    mockPrisma.appointment.findMany.mockResolvedValue([
      {
        scheduledStart: new Date('2026-03-26T10:00:00'),
        scheduledEnd: new Date('2026-03-26T11:00:00'),
        travelBuffer: 30,
        technicianId: 'tech-1',
      },
    ]);

    const slots = await getAvailability('2026-03-26', 'tech-1');

    // Slot at 09:00 (09:00-10:00) overlaps with effective start 09:30 - should be unavailable
    const slot0900 = slots.find((s) => s.start.includes('T09:00:00'));
    expect(slot0900?.available).toBe(false);

    // Slot at 08:00 (08:00-09:00) should be available (ends at 09:00, before 09:30)
    const slot0800 = slots.find((s) => s.start.includes('T08:00:00'));
    expect(slot0800?.available).toBe(true);
  });
});

// ─── createAppointment Tests ───
describe('createAppointment', () => {
  it('throws BAD_REQUEST when scheduled end is before scheduled start', async () => {
    const ticket = {
      id: 'ticket-1',
      technicianId: 'tech-1',
      customerId: 'customer-1',
      status: 'APPROUVEE',
      deletedAt: null,
      customer: { id: 'customer-1' },
    };

    mockPrisma.ticket.findFirst.mockResolvedValue(ticket);

    await expect(
      createAppointment(
        {
          ticketId: 'ticket-1',
          scheduledStart: '2026-03-26T15:00:00Z',
          scheduledEnd: '2026-03-26T14:00:00Z',
          travelBuffer: 0,
        },
        'admin-1',
        'ADMIN'
      )
    ).rejects.toThrow(/fin.*après.*début/i);
  });

  it('throws CONFLICT when technician has overlapping appointment', async () => {
    const ticket = {
      id: 'ticket-1',
      technicianId: 'tech-1',
      customerId: 'customer-1',
      status: 'APPROUVEE',
      deletedAt: null,
      customer: { id: 'customer-1' },
    };

    mockPrisma.ticket.findFirst.mockResolvedValue(ticket);
    mockPrisma.appointment.findFirst.mockResolvedValue({
      id: 'existing-appt',
      scheduledStart: new Date('2026-03-26T10:00:00Z'),
      scheduledEnd: new Date('2026-03-26T11:00:00Z'),
    });

    await expect(
      createAppointment(
        {
          ticketId: 'ticket-1',
          scheduledStart: '2026-03-26T10:30:00Z',
          scheduledEnd: '2026-03-26T11:30:00Z',
          travelBuffer: 0,
        },
        'admin-1',
        'ADMIN'
      )
    ).rejects.toThrow(/technicien.*deja.*rendez-vous/i);
  });

  it('creates an appointment when no conflicts exist', async () => {
    const ticket = {
      id: 'ticket-1',
      technicianId: 'tech-1',
      customerId: 'customer-1',
      status: 'APPROUVEE',
      deletedAt: null,
      customer: { id: 'customer-1' },
    };
    const createdAppt = {
      id: 'appt-1',
      ticketId: 'ticket-1',
      technicianId: 'tech-1',
      scheduledStart: new Date('2026-03-26T14:00:00Z'),
      scheduledEnd: new Date('2026-03-26T15:00:00Z'),
    };

    mockPrisma.ticket.findFirst.mockResolvedValue(ticket);
    mockPrisma.appointment.findFirst.mockResolvedValue(null); // no conflict
    mockPrisma.appointment.create.mockResolvedValue(createdAppt);

    const result = await createAppointment(
      {
        ticketId: 'ticket-1',
        scheduledStart: '2026-03-26T14:00:00Z',
        scheduledEnd: '2026-03-26T15:00:00Z',
        travelBuffer: 0,
      },
      'admin-1',
      'ADMIN'
    );

    expect(result.id).toBe('appt-1');
    expect(mockPrisma.appointment.create).toHaveBeenCalledOnce();
  });

  it('prevents technicians from creating appointments for another technician via payload override', async () => {
    const ticket = {
      id: 'ticket-1',
      technicianId: 'tech-1',
      customerId: 'customer-1',
      status: 'APPROUVEE',
      deletedAt: null,
      customer: { id: 'customer-1' },
    };

    mockPrisma.ticket.findFirst.mockResolvedValue(ticket);

    await expect(
      createAppointment(
        {
          ticketId: 'ticket-1',
          technicianId: 'tech-2',
          scheduledStart: '2026-03-26T14:00:00Z',
          scheduledEnd: '2026-03-26T15:00:00Z',
          travelBuffer: 0,
        },
        'tech-1',
        'TECHNICIAN'
      )
    ).rejects.toThrow(/vous-même/i);
  });

  it('throws NOT_FOUND for missing ticket', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue(null);

    await expect(
      createAppointment(
        {
          ticketId: 'missing',
          scheduledStart: '2026-03-26T14:00:00Z',
          scheduledEnd: '2026-03-26T15:00:00Z',
          travelBuffer: 0,
        },
        'admin-1',
        'ADMIN'
      )
    ).rejects.toThrow('Billet introuvable');
  });
});

describe('role-based appointment scoping', () => {
  it('ignores technicianId query override for technician appointment list', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ permissions: null });
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.count.mockResolvedValue(0);

    await getAppointments({ technicianId: 'other-tech', page: 1, limit: 20 }, 'tech-1', 'TECHNICIAN');

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technicianId: 'tech-1' }),
      })
    );
  });

  it('limits day schedule to the requesting technician when query overrides technicianId', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ permissions: null });
    mockPrisma.appointment.findMany.mockResolvedValue([]);

    await getDaySchedule('2026-03-26', 'other-tech', 'tech-1', 'TECHNICIAN');

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technicianId: 'tech-1' }),
      })
    );
  });

  it('keeps customer ticket scoping even when technicianId is supplied', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.count.mockResolvedValue(0);

    await getAppointments({ technicianId: 'tech-99', page: 1, limit: 20 }, 'customer-1', 'CUSTOMER');

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          technicianId: 'tech-99',
          ticket: { customerId: 'customer-1', deletedAt: null },
        }),
      })
    );
  });
});

describe('cancelAppointment', () => {
  it('rejects cancellation for appointments already in progress', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({
      id: 'appt-1',
      status: 'EN_COURS',
      technicianId: 'tech-1',
      ticket: {
        id: 'ticket-1',
        ticketNumber: 'TKT-001',
        title: 'Test',
        status: 'PLANIFIEE',
        customerId: 'customer-1',
        technicianId: 'tech-1',
      },
    });

    await expect(cancelAppointment('appt-1', 'customer-1', 'CUSTOMER')).rejects.toThrow(/planifie.*confirme/i);
  });
});
