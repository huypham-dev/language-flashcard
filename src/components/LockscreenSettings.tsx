import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { suppressNextAutoShow } from '@/lib/autoShow';
import { notify } from '@/lib/notify';
import { usePhraseStore } from '@/store/PhraseStore';
import { colors, radius } from '@/theme';

import { isSupported, Lockscreen, LockscreenPermissions, PermissionKind } from '../../modules/lockscreen';

const PERMISSIONS: { key: keyof LockscreenPermissions; label: string; hint: string; open: PermissionKind }[] = [
  { key: 'notifications', label: 'Thông báo', hint: 'Để app chạy nền (thông báo “đang chạy”).', open: 'notifications' },
  { key: 'overlay', label: 'Hiển thị trên ứng dụng khác', hint: 'Cho phép mở thẻ khi đang ở nền.', open: 'overlay' },
  { key: 'miuiLockscreen', label: 'Hiển thị trên màn hình khóa', hint: 'Quyền riêng của Xiaomi, trong “Quyền khác”.', open: 'miui' },
  { key: 'miuiBackgroundPopup', label: 'Mở cửa sổ mới khi chạy nền', hint: 'Quyền riêng của Xiaomi, trong “Quyền khác”.', open: 'miui' },
  { key: 'autostart', label: 'Tự khởi động', hint: 'Để app chạy lại sau khi khởi động lại máy.', open: 'autostart' },
  { key: 'battery', label: 'Pin: Không giới hạn', hint: 'Để Xiaomi không tắt app khi ngủ.', open: 'battery' },
];

const ICON = { granted: '✅', denied: '❌', unknown: '❓' } as const;

/** Phase 2 (#18, #19): “show on lock screen” switch + permission guide. Android dev/preview builds only. */
export function LockscreenSettings() {
  const store = usePhraseStore();
  const [enabled, setEnabled] = useState(() => Lockscreen?.getStatus().enabled ?? false);
  const [perms, setPerms] = useState<LockscreenPermissions | null>(() => Lockscreen?.getPermissions() ?? null);

  const refresh = useCallback(() => {
    if (!Lockscreen) return;
    setEnabled(Lockscreen.getStatus().enabled);
    setPerms(Lockscreen.getPermissions());
  }, []);

  useEffect(() => {
    // Re-check after the user comes back from a system settings page.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  if (!isSupported() || !Lockscreen) return null;
  const native = Lockscreen;

  const toggle = async (value: boolean) => {
    if (value) {
      if (perms?.notifications === 'denied') native.requestNotificationPermission();
      // The native card replaces the Phase 1 “show on open”; avoid showing two cards.
      if (store.data.settings.autoShowOnOpen) {
        await store.updateSettings({ autoShowOnOpen: false }).catch(() => undefined);
      }
      native.start('activity');
      notify('Đã bật. Tắt rồi bật màn hình để thử.');
    } else {
      native.stop();
    }
    refresh();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Hiện trên màn hình khóa</Text>
          <Text style={styles.rowSub}>Mỗi lần bật màn hình là hiện một thẻ học.</Text>
        </View>
        <Switch value={enabled} onValueChange={toggle} trackColor={{ true: colors.accent, false: colors.cardBorder }} />
      </View>

      {perms && (
        <View style={styles.perms}>
          <Text style={styles.note}>Trên Xiaomi cần cấp các quyền sau. ❓ là quyền máy không cho app đọc, bạn tự kiểm tra.</Text>
          {PERMISSIONS.map((p) => (
            <Pressable
              key={p.key}
              style={({ pressed }) => [styles.perm, pressed && { opacity: 0.6 }]}
              onPress={() => {
                suppressNextAutoShow();
                native.openPermissionSettings(p.open);
              }}>
              <Text style={styles.icon}>{ICON[perms[p.key]]}</Text>
              <View style={styles.rowText}>
                <Text style={styles.permTitle}>{p.label}</Text>
                <Text style={styles.rowSub}>{p.hint}</Text>
              </View>
              <Text style={styles.link}>Mở</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius, padding: 14 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.muted, fontSize: 13 },
  perms: { gap: 8 },
  perm: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius, padding: 12 },
  permTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  icon: { fontSize: 18 },
  link: { color: colors.accent, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 13 },
});
