import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useModelStore } from '../store';
import { deleteModel, modelsDiskUsage, refreshModels } from '../services/modelManager';
import { colors, radii, spacing } from '../theme/colors';

function humanBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${bytes} B`;
}

export function ManageModelsScreen() {
  const nav = useNavigation();
  const models = useModelStore(s => s.models);
  const [usage, setUsage] = useState(0);

  const refresh = async () => {
    await refreshModels();
    setUsage(await modelsDiskUsage());
  };

  useEffect(() => {
    refresh();
  }, []);

  const onDelete = (id: string) => {
    const m = models.find(x => x.id === id);
    if (!m) return;
    Alert.alert('Delete model?', `${m.displayName} will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteModel(m);
          refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12}>
          <Text style={styles.headerBtn}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Manage models</Text>
        <View style={{ width: 50 }} />
      </View>

      <Text style={styles.usage}>Disk usage: {humanBytes(usage)}</Text>

      <FlatList
        data={models}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.meta}>
                {[item.family, item.parameters, item.quantization, item.sizeLabel]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Pressable onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No models installed.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: { color: colors.accent, fontSize: 15, fontWeight: '600', width: 50 },
  headerTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  usage: { color: colors.textDim, fontSize: 13, padding: spacing.md },
  list: { paddingHorizontal: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElev,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  deleteBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.danger,
  },
  deleteText: { color: '#FFFFFF', fontWeight: '700' },
  empty: { color: colors.textDim, padding: spacing.lg, textAlign: 'center' },
});
