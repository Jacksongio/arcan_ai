import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StarfieldBg } from './StarfieldBg';
import { colors, radii, spacing } from '../shared/theme';
import { useChatStore } from '../shared';
import {
  useModelStore,
  MAX_MODELS,
  MODEL_DOWNLOAD_URL,
  RECOMMENDED_MODELS,
  importGGUFFromPicker,
  refreshModels,
} from '../models';
import { RootStackParamList } from '../navigation/RootNavigator';
import { MLCModel } from '../shared/types';
import { storage, KEYS } from '../shared/persistence';

const SHOW_DEBUG = true;

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const models = useModelStore(s => s.models);
  const selectedModelId = useModelStore(s => s.selectedModelId);
  const selectModel = useModelStore(s => s.selectModel);
  const startNewConversation = useChatStore(s => s.startNewConversation);
  const [importing, setImporting] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    refreshModels().catch(err => console.warn('refreshModels failed', err));
  }, []);

  const onImport = async () => {
    if (importing) return;
    if (models.length >= MAX_MODELS) {
      Alert.alert('Model limit reached', `You can store up to ${MAX_MODELS} models. Delete one before adding another.`);
      return;
    }
    try {
      setImporting(true);
      const m = await importGGUFFromPicker();
      if (m) {
        selectModel(m.id);
        setSetupOpen(false);
        openChatWith(m);
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Import failed', err?.message ?? String(err));
      }
    } finally {
      setImporting(false);
    }
  };

  const openChatWith = (model: MLCModel) => {
    selectModel(model.id);
    const conv = startNewConversation(model.id);
    nav.navigate('Chat', { conversationId: conv.id });
  };

  const onPrimary = () => {
    if (models.length === 0) {
      setSetupOpen(true);
      return;
    }
    const target = models.find(m => m.id === selectedModelId) ?? models[0];
    openChatWith(target);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StarfieldBg count={260} />

      {SHOW_DEBUG && (
        <View style={styles.debugRow}>
          <Pressable
            onPress={() => {
              storage.delete(KEYS.onboardingDone);
              nav.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
            }}
            hitSlop={8}
            style={styles.debugBtn}>
            <Text style={styles.debugText}>Debug</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.center}>
        <Image
          source={require('../../assets/clipped_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>ArcanAI</Text>
        <Text style={styles.tagline}>Privately chat with AI, no internet required!</Text>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={onPrimary} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>Start Chat</Text>
        </Pressable>

        {models.length > 0 ? (
          <View style={styles.linkRow}>
            <Pressable onPress={() => nav.navigate('ManageModels')} hitSlop={8}>
              <Text style={styles.linkText}>Manage models ({models.length})</Text>
            </Pressable>
            <Text style={styles.linkSep}>·</Text>
            <Pressable onPress={() => setSetupOpen(true)} hitSlop={8}>
              <Text style={styles.linkText}>Add model</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.hint}>No models yet — tap above to set one up</Text>
        )}
      </View>

      <Modal
        visible={setupOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSetupOpen(false)}>
        <SetupSheet
          onClose={() => setSetupOpen(false)}
          onImport={onImport}
          importing={importing}
        />
      </Modal>
    </SafeAreaView>
  );
}

function SetupSheet({
  onClose,
  onImport,
  importing,
}: {
  onClose: () => void;
  onImport: () => void;
  importing: boolean;
}) {
  return (
    <View style={sheet.root}>
      <View style={sheet.handleRow}>
        <Text style={sheet.title}>Get a model</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={sheet.close}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={sheet.content}>
        <Text style={sheet.body}>
          ArcanAI runs language models entirely on your device. Download a GGUF
          model from Hugging Face, then import the file here.
        </Text>

        <Pressable
          onPress={() => Linking.openURL(MODEL_DOWNLOAD_URL)}
          style={({ pressed }) => [sheet.primary, pressed && styles.pressed]}>
          <Text style={sheet.primaryText}>Browse GGUF models on Hugging Face</Text>
        </Pressable>

        <Pressable
          onPress={onImport}
          disabled={importing}
          style={({ pressed }) => [sheet.secondary, pressed && styles.pressed, importing && { opacity: 0.6 }]}>
          <Text style={sheet.secondaryText}>{importing ? 'Importing…' : 'Import a .gguf file'}</Text>
        </Pressable>

        <Text style={sheet.section}>RECOMMENDED STARTERS</Text>
        {RECOMMENDED_MODELS.map(r => (
          <Pressable
            key={r.url}
            onPress={() => Linking.openURL(r.url)}
            style={({ pressed }) => [sheet.recCard, pressed && styles.pressed]}>
            <Text style={sheet.recName}>{r.name}</Text>
            <Text style={sheet.recMeta}>{r.size}</Text>
            <Text style={sheet.recNote}>{r.note}</Text>
          </Pressable>
        ))}

        <Text style={sheet.help}>
          Tip: after downloading, open the file in Files / Downloads and choose “Share → ArcanAI”,
          or tap “Import a .gguf file”.
        </Text>
      </ScrollView>
    </View>
  );
}

const LOGO_SIZE = 240;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  debugBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: spacing.md,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },

  title: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.sm,
    textShadowColor: 'rgba(138, 107, 255, 0.4)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    color: colors.textDim,
    fontSize: 16,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pressed: { opacity: 0.85 },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  linkText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  linkSep: { color: colors.textDim, fontSize: 14 },
  hint: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
});

const sheet = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  close: { color: colors.accent, fontSize: 16, fontWeight: '600' },

  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  body: { color: colors.textDim, fontSize: 15, lineHeight: 22 },

  primary: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondary: {
    backgroundColor: colors.bgElev,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },

  section: {
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  recCard: {
    backgroundColor: colors.bgElev,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  recMeta: { color: colors.accent, fontSize: 13, marginTop: 2 },
  recNote: { color: colors.textDim, fontSize: 13, marginTop: 4, lineHeight: 18 },

  help: { color: colors.textDim, fontSize: 13, marginTop: spacing.md, lineHeight: 18 },
});
