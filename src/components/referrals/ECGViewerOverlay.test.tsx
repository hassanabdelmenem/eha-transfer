import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ECGViewerOverlay } from './ECGViewerOverlay';

describe('ECGViewerOverlay', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ECGViewerOverlay isOpen={false} imageUrl="https://example.com/ecg.png" onClose={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders dialog with image when isOpen is true and imageUrl is provided', () => {
    render(
      <ECGViewerOverlay isOpen={true} imageUrl="https://example.com/ecg.png" onClose={vi.fn()} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/ECG Quick-Viewer/i)).toBeInTheDocument();
    expect(screen.getByAltText(/ECG Diagnostic View/i)).toBeInTheDocument();
  });

  it('toggles high contrast mode', () => {
    render(
      <ECGViewerOverlay isOpen={true} imageUrl="https://example.com/ecg.png" onClose={vi.fn()} />
    );
    const contrastBtn = screen.getByRole('button', { name: /toggle high contrast/i });
    expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(contrastBtn);
    expect(contrastBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('adjusts zoom level on zoom in and zoom out and resets', () => {
    render(
      <ECGViewerOverlay isOpen={true} imageUrl="https://example.com/ecg.png" onClose={vi.fn()} />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();

    const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('150%')).toBeInTheDocument();

    const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.click(zoomInBtn);
    const resetBtn = screen.getByRole('button', { name: /reset view/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <ECGViewerOverlay isOpen={true} imageUrl="https://example.com/ecg.png" onClose={handleClose} />
    );
    const closeBtn = screen.getByRole('button', { name: /close ecg viewer/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <ECGViewerOverlay isOpen={true} imageUrl="https://example.com/ecg.png" onClose={handleClose} />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders accessible error alert when imageUrl is null or empty', () => {
    render(
      <ECGViewerOverlay isOpen={true} imageUrl={null} onClose={vi.fn()} />
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/ECG Image Unavailable/i)).toBeInTheDocument();
  });

  it('renders accessible error alert when image fails to load and handles retry', () => {
    render(
      <ECGViewerOverlay isOpen={true} imageUrl="https://example.com/broken-ecg.png" onClose={vi.fn()} />
    );
    const img = screen.getByAltText(/ECG Diagnostic View/i);
    fireEvent.error(img);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/The ECG \/ diagnostic image could not be loaded/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(screen.getByAltText(/ECG Diagnostic View/i)).toBeInTheDocument();
  });
});
