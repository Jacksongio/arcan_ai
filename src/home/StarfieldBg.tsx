import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../shared/theme';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  tint: string;
}

interface Props {
  count?: number;
}

const TINTS = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#CFE3FF', '#E9D8FF', '#FFE7C2'];

/** Static parallax-style starfield background. Cheap, no animation cost. */
export function StarfieldBg({ count = 220 }: Props) {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: count }).map(() => {
      const r = Math.random();
      const size = r < 0.7 ? 1.2 : r < 0.92 ? 1.8 : r < 0.985 ? 2.6 : 3.4;
      return {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        opacity: 0.2 + Math.random() * 0.7,
        tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      };
    });
  }, [count]);

  return (
    <View style={styles.container} pointerEvents="none">
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: s.tint,
            opacity: s.opacity,
            shadowColor: s.tint,
            shadowOpacity: 0.9,
            shadowRadius: s.size * 1.6,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
  },
});
