import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface Props {
  /** Normalized 0..1 amplitude. */
  level: number;
  active: boolean;
}

const BAR_COUNT = 24;

export function AudioWaveform({ level, active }: Props) {
  return (
    <View style={styles.row} pointerEvents="none">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <Bar key={i} index={i} level={level} active={active} />
      ))}
    </View>
  );
}

function Bar({ index, level, active }: { index: number; level: number; active: boolean }) {
  const h = useSharedValue(8);

  useEffect(() => {
    if (!active) {
      h.value = withTiming(8, { duration: 200 });
      return;
    }
    const phase = ((index % 8) - 4) / 4;
    const target = Math.max(8, Math.min(56, 16 + level * 48 - Math.abs(phase) * 6 + Math.random() * 6));
    h.value = withTiming(target, { duration: 90 });
  }, [level, active, index, h]);

  const animatedStyle = useAnimatedStyle(() => ({ height: h.value }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 64,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
