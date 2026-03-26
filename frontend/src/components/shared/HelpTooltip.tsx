import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { cn } from '../../lib/utils';

interface HelpTooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export default function HelpTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
}: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className={cn('max-w-xs text-sm', className)}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
