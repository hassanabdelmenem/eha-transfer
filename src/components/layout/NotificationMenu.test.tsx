import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NotificationMenu } from './NotificationMenu';
import { Notification } from '../../types';
import React from 'react';

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'u1',
    title: 'Urgent Referral Escalation',
    message: 'Referral for patient Sayed requires immediate review.',
    type: 'urgent',
    read: false,
    createdAt: new Date().toISOString(),
    referralId: 'ref-123',
  },
  {
    id: 'n2',
    userId: 'u1',
    title: 'Bed Allocation Complete',
    message: 'ICU Bed allocated successfully.',
    type: 'success',
    read: true,
    createdAt: new Date().toISOString(),
  },
];

describe('NotificationMenu', () => {
  it('renders bell button with unread count badge', () => {
    render(
      <BrowserRouter>
        <NotificationMenu
          notifications={mockNotifications}
          unreadCount={1}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      </BrowserRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Notifications \(1 unread\)/i });
    expect(bellBtn).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens popover dialog upon click and displays notification list', () => {
    const handleMarkAllRead = vi.fn();
    const handleMarkRead = vi.fn();

    render(
      <BrowserRouter>
        <NotificationMenu
          notifications={mockNotifications}
          unreadCount={1}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
        />
      </BrowserRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Notifications \(1 unread\)/i });
    fireEvent.click(bellBtn);

    expect(screen.getByRole('dialog', { name: /Notifications tray/i })).toBeInTheDocument();
    expect(screen.getByText('Urgent Referral Escalation')).toBeInTheDocument();
    expect(screen.getByText('Bed Allocation Complete')).toBeInTheDocument();
    expect(screen.getByText('View Transfer')).toBeInTheDocument();

    const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
    fireEvent.click(markAllBtn);
    expect(handleMarkAllRead).toHaveBeenCalledTimes(1);
  });
});
