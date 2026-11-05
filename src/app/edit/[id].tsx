import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { confirm, notify } from '@/lib/notify';
import { usePhraseStore } from '@/store/PhraseStore';
import { colors, radius } from '@/theme';

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready } = usePhraseStore();
  // Wait for the store so the form initialises with the stored values (e.g. on a deep link).
  if (!ready) return <View style={styles.root} />;
  return <EditForm id={id} />;
}

function EditForm({ id }: { id: string }) {
  const store = usePhraseStore();
  const isNew = id === 'new';
  const existing = isNew ? undefined : store.data.phrases.find((p) => p.id === id);

  const [phrase, setPhrase] = useState(existing?.phrase ?? '');
  const [meaning, setMeaning] = useState(existing?.meaning ?? '');
  const [example, setExample] = useState(existing?.example ?? '');
  const [exampleVi, setExampleVi] = useState(existing?.exampleVi ?? '');
  const [tags, setTags] = useState(existing?.tags?.join(', ') ?? '');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isNew && !existing) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Không tìm thấy' }} />
        <Text style={styles.missingText}>Câu này không còn tồn tại.</Text>
      </View>
    );
  }

  const phraseError = touched && phrase.trim() === '' ? 'Nhập cụm từ tiếng Anh' : null;
  const meaningError = touched && meaning.trim() === '' ? 'Nhập nghĩa tiếng Việt' : null;

  const save = async () => {
    setTouched(true);
    if (phrase.trim() === '' || meaning.trim() === '') return;
    const input = {
      phrase,
      meaning,
      example,
      exampleVi,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    setSaving(true);
    try {
      if (isNew) await store.add(input);
      else await store.update(id, input);
      router.back();
    } catch {
      notify('Không lưu được 😢');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm('Xóa câu?', `"${existing.phrase}" sẽ bị xóa vĩnh viễn.`, 'Xóa', true);
    if (!ok) return;
    try {
      await store.remove(existing.id);
      router.back();
    } catch {
      notify('Không xóa được 😢');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isNew ? 'Thêm câu' : 'Sửa câu' }} />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="Cụm từ / mẫu câu *" value={phrase} onChange={setPhrase} error={phraseError} placeholder="Break a leg" autoFocus={isNew} />
        <Field label="Nghĩa *" value={meaning} onChange={setMeaning} error={meaningError} placeholder="Chúc may mắn" />
        <Field label="Ví dụ (tiếng Anh)" value={example} onChange={setExample} placeholder="Big interview today? Break a leg!" multiline />
        <Field label="Dịch ví dụ" value={exampleVi} onChange={setExampleVi} placeholder="Hôm nay phỏng vấn hả? Chúc may mắn!" multiline />
        <Field label="Tags (cách nhau bằng dấu phẩy)" value={tags} onChange={setTags} placeholder="idiom, daily" />

        <Pressable style={[styles.save, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{isNew ? 'Thêm câu' : 'Lưu'}</Text>
        </Pressable>

        {!isNew && (
          <Pressable style={styles.delete} onPress={remove}>
            <Text style={styles.deleteText}>🗑️ Xóa câu</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  multiline,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline, error && { borderColor: colors.danger }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#5A6485"
        multiline={multiline}
        autoFocus={autoFocus}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  form: { padding: 16, gap: 16, paddingBottom: 48 },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 14 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 13 },
  save: { backgroundColor: colors.accent, borderRadius: radius, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveText: { color: colors.bg, fontWeight: '800', fontSize: 17 },
  delete: { borderColor: colors.danger, borderWidth: 1, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  missingText: { color: colors.muted, fontSize: 16 },
});
