import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, PROPOSAL_STATUS_COLORS, PROPOSAL_STATUS_LABELS, WO_STATUS_COLORS, WO_STATUS_LABELS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import HelpTooltip from './HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

interface StatusBadgeProps {
  status: string;
  type?: 'ticket' | 'priority' | 'appointment' | 'proposal' | 'workorder';
  className?: string;
}

export default function StatusBadge({ status, type = 'ticket', className }: StatusBadgeProps) {
  const { t } = useTranslation();
  let colors: { bg: string; text: string } | undefined;
  let label = status;

  switch (type) {
    case 'ticket':
      colors = STATUS_COLORS[status];
      label = STATUS_LABELS[status] || status;
      break;
    case 'priority':
      colors = PRIORITY_COLORS[status];
      label = PRIORITY_LABELS[status] || status;
      break;
    case 'appointment':
      colors = APPOINTMENT_STATUS_COLORS[status];
      label = APPOINTMENT_STATUS_LABELS[status] || status;
      break;
    case 'proposal':
      colors = PROPOSAL_STATUS_COLORS[status];
      label = PROPOSAL_STATUS_LABELS[status] || status;
      break;
    case 'workorder':
      colors = WO_STATUS_COLORS[status];
      label = WO_STATUS_LABELS[status] || status;
      break;
  }

  if (!colors) {
    colors = { bg: 'bg-gray-100', text: 'text-gray-700' };
  }

  // Look up description from i18n catalog using status.{type}.{value} keys
  const descriptionKey = `status.${type}.${status}`;
  const description = t(descriptionKey);
  // If t() returns the key itself, there's no translation — treat as no description
  const hasDescription = description !== descriptionKey;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colors.bg,
        colors.text,
        className
      )}
    >
      {label}
    </span>
  );

  if (hasDescription) {
    return (
      <HelpTooltip content={description} side="top">
        {badge}
      </HelpTooltip>
    );
  }

  return badge;
}
