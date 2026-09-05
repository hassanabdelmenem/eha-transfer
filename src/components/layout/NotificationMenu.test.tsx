import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NotificationMenu } from './NotificationMenu';
import { Notification } from '../../types';
import React from 'react';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1', userId: 'u1', title: 'Title', message: 'Message', type: 'info', read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const renderMenu = (props: Partial<React.ComponentProps<typeof NotificationMenu>> = {}) => render(
  <BrowserRouter>
    <NotificationMenu
      notifications={props.notifications ?? []}
      unreadCount={props.unreadCount ?? 0}
      onMarkRead={props.onMarkRead ?? vi.fn()}
      onMarkAllRead={props.onMarkAllRead ?? vi.fn()}
      className={props.className}
    />
  </BrowserRouter>
);

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

describe('NotificationMenu bell button', () => {
  it('shows a plain label and no badge with zero unread', () => {
    renderMenu({ unreadCount: 0 });
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
  });

  it('shows the exact unread count under 10', () => {
    renderMenu({ unreadCount: 3 });
    expect(screen.getByRole('button', { name: /Notifications \(3 unread\)/i })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('caps the badge at "9+" for 10 or more unread', () => {
    renderMenu({ unreadCount: 12 });
    expect(screen.getByText('9+')).toBeInTheDocument();
  });
});

describe('NotificationMenu popover', () => {
  it('is closed by default and opens on click', () => {
    renderMenu();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openMenu();
    expect(screen.getByRole('dialog', { name: /Notifications tray/i })).toBeInTheDocument();
  });

  it('toggles closed when the bell is clicked again', () => {
    renderMenu();
    openMenu();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    openMenu();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when clicking outside the menu', () => {
    renderMenu();
    openMenu();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not close when clicking inside the menu', () => {
    renderMenu();
    openMenu();
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('ignores a non-Escape key while open', () => {
    renderMenu();
    openMenu();
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows an empty state with no notifications', () => {
    renderMenu({ notifications: [] });
    openMenu();
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('shows at most the 6 most recent notifications', () => {
    const notifications = Array.from({ length: 8 }).map((_, i) => makeNotification({ id: `n${i}`, title: `Notif ${i}` }));
    renderMenu({ notifications, unreadCount: 8 });
    openMenu();
    expect(screen.getAllByText(/^Notif \d$/)).toHaveLength(6);
  });

  it('hides "Mark all read" and the unread-count chip when nothing is unread', () => {
    renderMenu({ notifications: [makeNotification({ read: true })], unreadCount: 0 });
    openMenu();
    expect(screen.queryByRole('button', { name: /Mark all read/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/new$/)).not.toBeInTheDocument();
  });

  it('calls onMarkAllRead when "Mark all read" is clicked', () => {
    const onMarkAllRead = vi.fn();
    renderMenu({ notifications: [makeNotification()], unreadCount: 1, onMarkAllRead });
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /Mark all read/i }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it.each(['urgent', 'warning', 'purple', 'success', 'info'] as const)(
    'renders a "%s"-toned notification', (type) => {
      renderMenu({ notifications: [makeNotification({ type, title: `A ${type} note` })], unreadCount: 1 });
      openMenu();
      expect(screen.getByText(`A ${type} note`)).toBeInTheDocument();
    }
  );

  it('shows a "Mark read" action only for an unread notification, and calls onMarkRead', () => {
    const onMarkRead = vi.fn();
    renderMenu({
      notifications: [
        makeNotification({ id: 'unread', title: 'Unread note', read: false }),
        makeNotification({ id: 'read', title: 'Read note', read: true }),
      ],
      unreadCount: 1,
      onMarkRead,
    });
    openMenu();

    const markReadButtons = screen.getAllByRole('button', { name: /Mark read/i });
    expect(markReadButtons).toHaveLength(1);
    fireEvent.click(markReadButtons[0]);
    expect(onMarkRead).toHaveBeenCalledWith('unread');
  });

  it('shows a "View Transfer" link only when the notification has a referralId, and marks it read + closes on click', () => {
    const onMarkRead = vi.fn();
    renderMenu({
      notifications: [
        makeNotification({ id: 'with-ref', title: 'Has referral', referralId: 'r1' }),
        makeNotification({ id: 'without-ref', title: 'No referral' }),
      ],
      unreadCount: 2,
      onMarkRead,
    });
    openMenu();

    expect(screen.getAllByText('View Transfer')).toHaveLength(1);
    fireEvent.click(screen.getByText('View Transfer'));
    expect(onMarkRead).toHaveBeenCalledWith('with-ref');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the menu when "View full notification history" is clicked', () => {
    renderMenu();
    openMenu();
    fireEvent.click(screen.getByText('View full notification history'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies a custom className to the outer wrapper', () => {
    const { container } = renderMenu({ className: 'my-extra-class' });
    expect(container.querySelector('.my-extra-class')).toBeInTheDocument();
  });
});
