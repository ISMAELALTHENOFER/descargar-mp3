declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window.showDirectoryPicker === 'function';
}

export async function verifyDirectoryAccess(
  dirHandle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    const testFile = await dirHandle.getFileHandle('_test_write.tmp', {
      create: true,
    });
    const writable = await testFile.createWritable();
    await writable.write(new Blob(['test']));
    await writable.close();
    await dirHandle.removeEntry('_test_write.tmp');
    return true;
  } catch {
    return false;
  }
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) {
    throw new Error('File System Access API not supported');
  }

  const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });

  const canWrite = await verifyDirectoryAccess(dirHandle);
  if (!canWrite) {
    throw new Error(
      'No se puede escribir en esta carpeta. Selecciona otra ubicación (ej: Escritorio, Documentos o Descargas).'
    );
  }

  return dirHandle;
}

export async function writeFileToDir(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob
): Promise<void> {
  const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
  const fileHandle = await dirHandle.getFileHandle(safeFilename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
