import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ECGViewerOverlay } from './ECGViewerOverlay';

describe('ECGViewerOverlay - Adversarial Stress & Edge Case Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Null, Undefined, and Falsy imageUrl Edge Cases', () => {
    it('handles null imageUrl without crashing and renders accessible error alert', () => {
      const handleClose = vi.fn();
      render(
        <ECGViewerOverlay isOpen={true} imageUrl={null} onClose={handleClose} />
      );

      const dialog = screen.getByRole('dialog', { name: /ecg diagnostic viewer/i });
      expect(dialog).toBeInTheDocument();

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText(/No valid image URL was provided for this clinical attachment/i)).toBeInTheDocument();

      // Controls should be disabled
      const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });
      const contrastBtn = screen.getByRole('button', { name: /toggle high contrast/i });
      const resetBtn = screen.getByRole('button', { name: /reset view/i });

      expect(zoomInBtn).toBeDisabled();
      expect(zoomOutBtn).toBeDisabled();
      expect(contrastBtn).toBeDisabled();
      expect(resetBtn).toBeDisabled();

      // No retry button when imageUrl is null
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();

      // Close button inside alert works
      const closeAlertBtn = screen.getByRole('button', { name: /^close$/i });
      fireEvent.click(closeAlertBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('handles undefined imageUrl gracefully without crashing', () => {
      render(
        <ECGViewerOverlay isOpen={true} imageUrl={undefined as unknown as null} onClose={vi.fn()} />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/No valid image URL was provided/i)).toBeInTheDocument();
    });

    it('handles empty string imageUrl gracefully without crashing', () => {
      render(
        <ECGViewerOverlay isOpen={true} imageUrl="" onClose={vi.fn()} />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/No valid image URL was provided/i)).toBeInTheDocument();
    });
  });

  describe('Broken Image Error State & Retry Mechanism', () => {
    it('transitions to error state on image loading failure and allows recovery via Retry button', () => {
      render(
        <ECGViewerOverlay isOpen={true} imageUrl="https://storage.eha.gov.eg/broken_trace.png" onClose={vi.fn()} />
      );

      // Initially image is mounted
      const img = screen.getByAltText(/ecg diagnostic view/i);
      expect(img).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Simulate image load error
      fireEvent.error(img);

      // Alert should now be visible
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText(/The ECG \/ diagnostic image could not be loaded/i)).toBeInTheDocument();

      // Controls should be disabled while in error state
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /toggle high contrast/i })).toBeDisabled();

      // Retry button is available for valid non-null imageUrl
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();

      // Click Retry
      fireEvent.click(retryBtn);

      // Image element should be mounted again and error alert cleared
      const retriedImg = screen.getByAltText(/ecg diagnostic view/i);
      expect(retriedImg).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Simulate successful image load after retry
      fireEvent.load(retriedImg);
      expect(retriedImg).toHaveClass('opacity-100');
    });
  });

  describe('Extreme Zoom Boundary Stress Testing', () => {
    it('clamps zoom in to maximum 500% (5.0x) under rapid clicking stress', () => {
      render(
        <ECGViewerOverlay isOpen={true} imageUrl="https://storage.eha.gov.eg/ecg_lead_1.png" onClose={vi.fn()} />
      );

      const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });

      // Click Zoom In 15 times in rapid succession
      for (let i = 0; i < 15; i++) {
        if (!zoomInBtn.hasAttribute('disabled')) {
          fireEvent.click(zoomInBtn);
        }
      }

      // Max scale should be 500% and button should be disabled
      expect(screen.getByText('500%')).toBeInTheDocument();
      expect(zoomInBtn).toBeDisabled();

      // Zoom out should still be enabled
      const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });
      expect(zoomOutBtn).not.toBeDisabled();
    });

    it('clamps zoom out to minimum 50% (0.5x) under rapid clicking stress', () => {
      render(
        <ECGViewerOverlay isOpen={true} imageUrl="https://storage.eha.gov.eg/ecg_lead_1.png" onClose={vi.fn()} />
      );

      const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });

      // Click Zoom Out 15 times in rapid succession
      for (let i = 0; i < 15; i++) {
        if (!zoomOutBtn.hasAttribute('disabled')) {
          fireEvent.click(zoomOutBtn);
        }
      }

      // Min scale should be 50% and button should be disabled
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(zoomOutBtn).toBeDisabled();

      // Zoom in should still be enabled
      const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
      expect(zoomInBtn).not.toBeDisabled();
    });

    it('resets zoom to 100% and disables high contrast when Reset View is clicked from extreme zoom', () => {
      render(
        <ECGViewerOverlay isOpen={true} imageUrl="https://storage.eha.gov.eg/ecg_lead_1.png" onClose={vi.fn()} />
      );

      const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
      const contrastBtn = screen.getByRole('button', { name: /toggle high contrast/i });
      const resetBtn = screen.getByRole('button', { name: /reset view/i });

      // Zoom to max
      for (let i = 0; i < 10; i++) {
        if (!zoomInBtn.hasAttribute('disabled')) {
          fireEvent.click(zoomInBtn);
        }
      }
      expect(screen.getByText('500%')).toBeInTheDocument();

      // Enable high contrast
      fireEvent.click(contrastBtn);
      expect(contrastBtn).toHaveAttribute('aria-pressed', 'true');

      // Click Reset View
      fireEvent.click(resetBtn);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Keyboard Event & Lifecycle Stress Testing', () => {
    it('dismisses overlay on Escape key press, but ignores all other keyboard keys', () => {
      const handleClose = vi.fn();
      render(
        <ECGViewerOverlay isOpen={true} imageUrl="https://storage.eha.gov.eg/ecg.png" onClose={handleClose} />
      );

      // Irrelevant keys should NOT trigger close
      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Space' });
      fireEvent.keyDown(window, { key: 'Tab' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'c' });
      expect(handleClose).not.toHaveBeenCalled();

      // Escape key triggers close
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not trigger close on Escape when isOpen is false', () => {
      const handleClose = vi.fn();
      render(
        <ECGViewerOverlay isOpen={false} imageUrl="https://storage.eha.gov.eg/ecg.png" onClose={handleClose} />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('cleans up window event listener upon unmounting', () => {
      const handleClose = vi.fn();
      const { unmount } = render(
        <ECGViewerOverlay isOpen={true} imageUrl="https://storage.eha.gov.eg/ecg.png" onClose={handleClose} />
      );

      unmount();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('High Contrast Mode Filter Application', () => {
    it('toggles visual filter styles on the image element correctly', () => {
      render(
        <ECGViewerOverlay isOpen={true} imageUrl="https://storage.eha.gov.eg/ecg.png" onClose={vi.fn()} />
      );

      const img = screen.getByAltText(/ecg diagnostic view/i);
      const contrastBtn = screen.getByRole('button', { name: /toggle high contrast/i });

      // Default style
      expect(img.style.filter).toBe('none');

      // Turn on high contrast
      fireEvent.click(contrastBtn);
      expect(img.style.filter).toBe('contrast(1.6) brightness(0.9) grayscale(0.5)');

      // Turn off high contrast
      fireEvent.click(contrastBtn);
      expect(img.style.filter).toBe('none');
    });
  });
});
