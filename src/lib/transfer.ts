import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { suppressNextAutoShow } from '@/lib/autoShow';

export function exportFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `lockscreen-english-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.json`;
}

/** Writes JSON to a file and opens the share sheet (or downloads it on web). */
export async function shareJson(json: string, fileName = exportFileName()): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  suppressNextAutoShow();
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Xuất dữ liệu' });
}

/** Lets the user pick a JSON file and returns its text, or null if cancelled. */
export async function pickJsonText(): Promise<string | null> {
  suppressNextAutoShow();
  // '*/*' because many Android apps (Zalo, Drive…) hand over JSON as octet-stream.
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (Platform.OS === 'web' && asset.file) return asset.file.text();
  return new File(asset.uri).text();
}
