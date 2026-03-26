import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders ticket status with French label', () => {
    render(<StatusBadge status="NOUVELLE" />);
    expect(screen.getByText('Nouvelle')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(<StatusBadge status="URGENTE" type="priority" />);
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  it('renders appointment status badge', () => {
    render(<StatusBadge status="PLANIFIE" type="appointment" />);
    expect(screen.getByText('Planifié')).toBeInTheDocument();
  });

  it('falls back to gray for unknown status', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);
    const badge = screen.getByText('UNKNOWN_STATUS');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-gray-100');
  });

  it('applies custom className', () => {
    render(<StatusBadge status="NOUVELLE" className="ml-4" />);
    const badge = screen.getByText('Nouvelle');
    expect(badge.className).toContain('ml-4');
  });
});
