import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhraseCard } from '@/components/PhraseCard';
import {
  afterNextFrames,
  consumeDismissedReturn,
  dismissLockscreen,
  ensureUnlocked,
  isPhoneLocked,
  nativeLockscreenEnabled,
  setCardOnScreen,
  uncoverAfterDraw,
} from '@/lib/lockscreenBridge';
import { notify } from '@/lib/notify';
import { hideSplash } from '@/lib/splash';
import { useSpeech } from '@/lib/useSpeech';
import { usePhraseStore } from '@/store/PhraseStore';
import { colors, radius } from '@/theme';

const SWIPE_DISTANCE = 120;
const SWIPE_VELOCITY = 1.2;

export default function LockscreenScreen() {
  const store = usePhraseStore();
  const { available: canSpeak, speak } = useSpeech();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const started = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [translateY] = useState(() => new Animated.Value(0));

  const autoShowOnOpen = store.data.settings.autoShowOnOpen;
  const autoShowRef = useRef(autoShowOnOpen);
  useEffect(() => {
    autoShowRef.current = autoShowOnOpen;
  }, [autoShowOnOpen]);

  const current = store.data.phrases.find((p) => p.id === currentId) ?? null;

  const next = useCallback(async () => {
    setFlipped(false);
    try {
      const p = await store.showNext();
      setCurrentId(p?.id ?? null);
    } catch {
      notify('Không lưu được tiến độ 😢');
    }
  }, [store]);

  useEffect(() => {
    if (store.ready && !started.current) {
      started.current = true;
      next().finally(() => setLoaded(true));
    }
  }, [store.ready, next]);

  // Cold start: drop the splash only once the first card is on screen.
  useEffect(() => {
    if (loaded) hideSplash();
  }, [loaded]);

  // Report the card as on screen once it is drawn (a couple of frames after the commit),
  // so native uncovers the app / allows the task snapshot only when it shows the card.
  useFocusEffect(
    useCallback(() => {
      if (!loaded) return;
      let active = true;
      afterNextFrames().then(() => {
        if (active) setCardOnScreen(true);
      });
      return () => {
        active = false;
        setCardOnScreen(false);
      };
    }, [loaded]),
  );

  // The card must not change while the app is away: the snapshot shows what was on screen
  // when it left, and a different card behind it would flash on SCREEN_ON. The next card
  // is drawn before the task goes back instead (sendAway).
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (!nativeLockscreenEnabled()) return;
      if (state === 'background' || state === 'active') translateY.setValue(0); // safety net
      // Opened normally after the card was dismissed over the keyguard: the card only stayed
      // mounted for the next SCREEN_ON. Go back to the app unless auto show wants the card.
      if (state === 'active' && (await consumeDismissedReturn())) {
        if (!autoShowRef.current) {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }
        uncoverAfterDraw();
      }
    });
    return () => sub.remove();
  }, [translateY]);

  /**
   * Over the keyguard the task goes to the back and the card stays mounted. Draw the next
   * card first, so the snapshot Android takes now is exactly what SCREEN_ON brings back.
   */
  const sendAway = useCallback(async () => {
    if (isPhoneLocked()) {
      await next();
      translateY.setValue(0);
      await afterNextFrames();
    }
    dismissLockscreen();
  }, [next, translateY]);

  // Over the keyguard, Back must not reveal the rest of the app: send the card away instead.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isPhoneLocked()) return false;
      sendAway();
      return true;
    });
    return () => sub.remove();
  }, [sendAway]);

  const addPhrase = async () => {
    if (await ensureUnlocked()) router.replace('/edit/new');
  };

  const close = useCallback(() => {
    Animated.timing(translateY, { toValue: -1000, duration: 180, useNativeDriver: true }).start(() => {
      sendAway();
    });
  }, [translateY, sendAway]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => translateY.setValue(Math.min(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy < -SWIPE_DISTANCE || g.vy < -SWIPE_VELOCITY) close();
          else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [translateY, close],
  );

  const toggleMastered = async () => {
    if (!current) return;
    const mastered = current.status === 'mastered';
    try {
      await store.setStatus(current.id, mastered ? 'learning' : 'mastered');
      if (!mastered) {
        notify('Đã thuộc ✅');
        await next();
      }
    } catch {
      notify('Không lưu được 😢');
    }
  };

  return (
    <View style={styles.root} {...pan.panHandlers}>
      <StatusBar hidden />
      <Animated.View style={[styles.fill, { transform: [{ translateY }] }]}>
        <SafeAreaView style={styles.fill}>
          <View style={styles.top}>
            <Text style={styles.brand}>Lockscreen English</Text>
            <Pressable onPress={close} hitSlop={16} accessibilityLabel="Đóng">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.center}>
            {!loaded ? null : current ? (
              <PhraseCard phrase={current} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Chưa có câu nào, thêm câu đi bạn ơi 🥲</Text>
                <Pressable style={styles.primary} onPress={addPhrase}>
                  <Text style={styles.primaryText}>➕ Thêm câu</Text>
                </Pressable>
              </View>
            )}
          </View>

          {current && (
            <View style={styles.actions}>
              {canSpeak && (
                <ActionButton
                  label="🔊 Đọc"
                  onPress={() => speak(flipped && current.example ? `${current.phrase}. ${current.example}` : current.phrase)}
                />
              )}
              <ActionButton
                label={current.status === 'mastered' ? '↩️ Chưa thuộc lắm' : '✅ Đã thuộc'}
                onPress={toggleMastered}
                tone={current.status === 'mastered' ? 'warn' : 'success'}
              />
              <ActionButton label="⏭️ Câu khác" onPress={next} />
            </View>
          )}

          <Text style={styles.swipeHint}>Vuốt lên để đóng</Text>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone?: 'success' | 'warn';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        tone && { borderColor: colors[tone] },
        pressed && { opacity: 0.6 },
      ]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 },
  brand: { color: colors.muted, fontSize: 13, letterSpacing: 1 },
  close: { color: colors.muted, fontSize: 22 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingHorizontal: 16 },
  action: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    borderRadius: radius,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  swipeHint: { color: colors.muted, textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  empty: { alignItems: 'center', gap: 20 },
  emptyText: { color: colors.text, fontSize: 18, textAlign: 'center' },
  primary: { backgroundColor: colors.accent, borderRadius: radius, paddingVertical: 12, paddingHorizontal: 20 },
  primaryText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
});
