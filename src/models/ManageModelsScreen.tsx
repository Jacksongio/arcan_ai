import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useModelStore } from './modelStore';
import {
  deleteModel,
  importGGUFFromPicker,
  MAX_MODELS,
  MODEL_DOWNLOAD_URL,
  modelsDiskUsage,
  refreshModels,
} from './modelManager';
import { colors, radii, spacing } from '../shared/theme';
import { PencilIcon } from '../shared/icons';
import { MLCModel } from '../shared/types';

function humanBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${bytes} B`;
}

export function ManageModelsScreen() {
  const nav = useNavigation();
  const models = useModelStore(s => s.models);
  const selectedModelId = useModelStore(s => s.selectedModelId);
  const selectModel = useModelStore(s => s.selectModel);
  const renameModel = useModelStore(s => s.renameModel);
  const [usage, setUsage] = useState(0);
  const [importing, setImporting] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MLCModel | null>(null);
  const [renameText, setRenameText] = useState('');

  const refresh = async () => {
    await refreshModels();
    setUsage(await modelsDiskUsage());
  };

  useEffect(() => {
    refresh();
  }, []);

  const onDelete = (model: MLCModel) => {
    Alert.alert('Delete model?', `"${model.displayName}" will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteModel(model);
          refresh();
        },
      },
    ]);
  };

  const onSelect = (model: MLCModel) => {
    selectModel(model.id);
  };

  const onRename = (model: MLCModel) => {
    setRenameText(model.displayName);
    setRenameTarget(model);
  };

  const confirmRename = () => {
    const trimmed = renameText.trim();
    if (trimmed && renameTarget) renameModel(renameTarget.id, trimmed);
    setRenameTarget(null);
  };

  const onImport = async () => {
    if (importing) return;
    if (models.length >= MAX_MODELS) {
      Alert.alert(
        'Model limit reached',
        `You can store up to ${MAX_MODELS} models. Delete one before adding another.`,
      );
      return;
    }
    try {
      setImporting(true);
      const m = await importGGUFFromPicker();
      if (m) {
        selectModel(m.id);
        refresh();
      }
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code !== 'DOCUMENT_PICKER_CANCELED' && code !== 'OPERATION_CANCELED') {
        Alert.alert('Import failed', err?.message ?? String(err));
      }
    } finally {
      setImporting(false);
    }
  };

  const atLimit = models.length >= MAX_MODELS;
  const slotsUsed = models.length;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Models</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryHeading}>Storage</Text>
            <Text style={styles.summaryUsage}>{humanBytes(usage)}</Text>
          </View>
          <View style={styles.slotsPill}>
            <Text style={styles.slotsText}>
              {slotsUsed} / {MAX_MODELS} slots
            </Text>
          </View>
        </View>
        <View style={styles.slotBar}>
          {Array.from({ length: MAX_MODELS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.slotSegment,
                i < slotsUsed ? styles.slotFilled : styles.slotEmpty,
                i === 0 && styles.slotFirst,
                i === MAX_MODELS - 1 && styles.slotLast,
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={styles.sectionLabel}>INSTALLED MODELS</Text>

      <FlatList
        data={models}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>{'{ }'}</Text>
            <Text style={styles.emptyTitle}>No models yet</Text>
            <Text style={styles.emptyBody}>
              Download a GGUF model from Hugging Face,{'\n'}then import it below.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = item.id === selectedModelId;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.card,
                isSelected && styles.cardSelected,
                pressed && { opacity: 0.85 },
              ]}>
              {isSelected && <View style={styles.selectedBar} />}
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardName, isSelected && styles.cardNameActive]} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    <Pressable onPress={() => onRename(item)} hitSlop={8} style={styles.renameBtn}>
                      <PencilIcon size={14} color={colors.textDim} />
                    </Pressable>
                    {isSelected && (
                      <View style={styles.activePill}>
                        <Text style={styles.activeText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardSize}>{item.sizeLabel ?? '—'}</Text>
                </View>

                <View style={styles.tagRow}>
                  {[item.family, item.parameters, item.quantization]
                    .filter(Boolean)
                    .map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                </View>

                <View style={styles.cardFooter}>
                  {!isSelected && (
                    <Pressable onPress={() => onSelect(item)} hitSlop={6}>
                      <Text style={styles.selectText}>Set active</Text>
                    </Pressable>
                  )}
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => onDelete(item)} hitSlop={6} style={styles.removeBtn}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Pressable
          onPress={onImport}
          disabled={importing || atLimit}
          style={({ pressed }) => [
            styles.importBtn,
            pressed && { opacity: 0.85 },
            (importing || atLimit) && styles.btnDisabled,
          ]}>
          <Text style={styles.importIcon}>+</Text>
          <Text style={styles.importText}>
            {importing ? 'Importing...' : atLimit ? 'Model limit reached' : 'Import .gguf file'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(MODEL_DOWNLOAD_URL)}
          style={({ pressed }) => [styles.browseBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.browseText}>Browse Hugging Face</Text>
        </Pressable>
      </View>

      <Modal visible={renameTarget !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setRenameTarget(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Rename Model</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              selectTextOnFocus
              placeholderTextColor={colors.textDim}
              selectionColor={colors.accent}
              onSubmitEditing={confirmRename}
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setRenameTarget(null)} style={styles.modalBtn}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmRename} style={styles.modalBtn}>
                <Text style={styles.modalConfirm}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  summaryCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  summaryHeading: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryUsage: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  slotsPill: {
    backgroundColor: 'rgba(138, 107, 255, 0.12)',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  slotsText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  slotBar: {
    flexDirection: 'row',
    gap: 3,
  },
  slotSegment: {
    flex: 1,
    height: 6,
  },
  slotFilled: {
    backgroundColor: colors.accent,
  },
  slotEmpty: {
    backgroundColor: colors.border,
  },
  slotFirst: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  slotLast: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },

  sectionLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.lg,
  },

  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },

  card: {
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardSelected: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  selectedBar: {
    width: 4,
    backgroundColor: colors.accent,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    paddingLeft: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: spacing.sm,
  },
  cardName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  cardNameActive: {
    color: '#FFFFFF',
  },
  renameBtn: {
    padding: 4,
  },
  cardSize: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '500',
  },
  activePill: {
    backgroundColor: 'rgba(59, 209, 111, 0.15)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeText: {
    color: colors.ok,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(138, 107, 255, 0.08)',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '500',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  selectText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  removeText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 6,
  },
  emptyIcon: {
    color: colors.textDim,
    fontSize: 28,
    fontWeight: '300',
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  importBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  importIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '400',
    marginTop: -1,
  },
  importText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  browseBtn: {
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(138, 107, 255, 0.08)',
  },
  browseText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: { opacity: 0.45 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  modalBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  modalCancel: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirm: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
