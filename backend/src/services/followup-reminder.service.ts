import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import * as notificationService from './notification.service.js';
import { sendEmail } from './email.service.js';
import type { FollowUpType } from '@prisma/client';

// ─── French labels for follow-up types ───

const FOLLOWUP_TYPE_LABELS: Record<FollowUpType, string> = {
  VERIFICATION_GARANTIE: 'Vérification de garantie',
  RAPPEL_CLIENT: 'Rappel client',
  REVERIFICATION: 'Revérification',
  ARRIVEE_PIECES: 'Arrivée de pièces',
  SUIVI_DEVIS: 'Suivi de devis',
};

/**
 * Process all follow-up reminders that are due within the next 24 hours.
 *
 * Queries FollowUp records that are:
 *   - Not completed
 *   - Scheduled within the next 24 hours (between now and now + 24h)
 *   - Not already reminded (remindedAt is null)
 *
 * For each, sends a notification + email to the assigned technician
 * and marks the follow-up as reminded.
 *
 * Returns the count of processed and successfully reminded follow-ups.
 */
export async function processFollowUpReminders(): Promise<{
  processed: number;
  reminded: number;
}> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find all upcoming follow-ups that haven't been reminded yet
  const dueFollowUps = await prisma.followUp.findMany({
    where: {
      completed: false,
      remindedAt: null,
      scheduledDate: {
        gte: now,
        lte: in24h,
      },
    },
    include: {
      worksheet: {
        select: {
          id: true,
          technicianId: true,
          workOrderId: true,
          ticketId: true,
          workOrder: {
            select: {
              orderNumber: true,
            },
          },
          ticket: {
            select: {
              ticketNumber: true,
            },
          },
          technician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  logger.info(
    { count: dueFollowUps.length },
    'Follow-up reminders: found due follow-ups'
  );

  let reminded = 0;

  for (const followUp of dueFollowUps) {
    try {
      const { worksheet } = followUp;
      const technician = worksheet.technician;
      const typeLabel = FOLLOWUP_TYPE_LABELS[followUp.followUpType];

      // Build a reference string (work order number or ticket number)
      const refNumber =
        worksheet.workOrder?.orderNumber ??
        worksheet.ticket?.ticketNumber ??
        worksheet.id.slice(0, 8);

      const scheduledStr = followUp.scheduledDate.toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // ── Send in-app notification ──
      await notificationService.notify({
        userId: technician.id,
        type: 'FOLLOWUP_REMINDER',
        title: 'Rappel de suivi',
        message: `Suivi prévu : ${typeLabel} pour ${refNumber} le ${scheduledStr}`,
      });

      // ── Send email reminder ──
      if (technician.email) {
        const subject = `Rappel : ${typeLabel} — ${refNumber}`;
        const body = [
          `Bonjour ${technician.firstName},`,
          '',
          `Vous avez un suivi prévu prochainement :`,
          '',
          `  • Type : ${typeLabel}`,
          `  • Référence : ${refNumber}`,
          `  • Date prévue : ${scheduledStr}`,
          followUp.notes ? `  • Notes : ${followUp.notes}` : '',
          '',
          `Merci de compléter ce suivi dans les délais.`,
          '',
          '— Valitek',
        ]
          .filter(Boolean)
          .join('\n');

        await sendEmail({
          to: technician.email,
          subject,
          body,
        });
      }

      // ── Mark as reminded ──
      await prisma.followUp.update({
        where: { id: followUp.id },
        data: { remindedAt: new Date() },
      });

      reminded++;

      logger.info(
        {
          followUpId: followUp.id,
          technicianId: technician.id,
          followUpType: followUp.followUpType,
          scheduledDate: followUp.scheduledDate,
        },
        'Follow-up reminder sent'
      );
    } catch (err) {
      // Log and continue — one failure should not block others
      logger.error(
        {
          err,
          followUpId: followUp.id,
          worksheetId: followUp.worksheetId,
        },
        'Failed to send follow-up reminder'
      );
    }
  }

  return { processed: dueFollowUps.length, reminded };
}
