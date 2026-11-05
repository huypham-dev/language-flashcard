import { Alert, Platform, ToastAndroid } from 'react-native';

/** Short, non-blocking message (toast on Android, alert elsewhere). */
export function notify(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(message);
}

export interface Choice<T> {
  text: string;
  value: T;
  style?: 'default' | 'cancel' | 'destructive';
}

/** Promise-based dialog. Resolves with the chosen value, or null if dismissed. */
export function choose<T>(title: string, message: string, choices: Choice<T>[]): Promise<T | null> {
  if (Platform.OS === 'web') {
    // RN-web has no Alert: fall back to confirm() on the last (primary) non-cancel choice.
    const primary = [...choices].reverse().find((c) => c.style !== 'cancel');
    return Promise.resolve(primary && window.confirm(`${title}\n\n${message}`) ? primary.value : null);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      choices.map((c) => ({ text: c.text, style: c.style, onPress: () => resolve(c.value) })),
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export async function confirm(title: string, message: string, okText = 'OK', destructive = false): Promise<boolean> {
  const r = await choose(title, message, [
    { text: 'Hủy', value: false, style: 'cancel' },
    { text: okText, value: true, style: destructive ? 'destructive' : 'default' },
  ]);
  return r === true;
}
