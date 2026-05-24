const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

export async function downloadObsidianExport(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/export/obsidian`);

  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    throw new Error(details?.message ?? 'Unable to export Obsidian ZIP.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getFileName(response.headers.get('content-disposition'));
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getFileName(contentDisposition: string | null): string {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? 'goalscape-obsidian-export.zip';
}
