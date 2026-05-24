import { useState } from 'react';
import { downloadObsidianExport } from '../services/exportApi';

type ObsidianExportButtonProps = {
  disabled?: boolean;
};

export function ObsidianExportButton({ disabled }: ObsidianExportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'error'>('idle');

  async function handleClick() {
    setStatus('exporting');

    try {
      await downloadObsidianExport();
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <button
      className={`obsidian-export-button ${status === 'error' ? 'obsidian-export-button-error' : ''}`}
      type="button"
      disabled={disabled || status === 'exporting'}
      onClick={handleClick}
      title={status === 'error' ? 'Obsidian export failed' : 'Export Obsidian vault ZIP'}
    >
      <span>{status === 'exporting' ? 'Exporting' : 'Export Obsidian'}</span>
    </button>
  );
}
