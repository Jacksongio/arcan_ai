import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../shared/theme';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  tint: string;
  twinkle: boolean;
  twinkleDuration: number;
  twinkleDelay: number;
  twinkleMin: number;
}

interface Props {
  count?: number;
}

const TINTS = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#CFE3FF', '#E9D8FF', '#FFE7C2'];

function TwinklingStar({ star }: { star: Star }) {
  const anim = useRef(new Animated.Value(star.opacity)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: star.twinkleMin,
          duration: star.twinkleDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          delay: star.twinkleDelay,
        }),
        Animated.timing(anim, {
          toValue: star.opacity,
          duration: star.twinkleDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, star]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: star.size,
        height: star.size,
        borderRadius: star.size,
        backgroundColor: star.tint,
        opacity: anim,
        shadowColor: star.tint,
        shadowOpacity: 0.9,
        shadowRadius: star.size * 1.6,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

export function StarfieldBg({ count = 220 }: Props) {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: count }).map(() => {
      const r = Math.random();
      const size = r < 0.7 ? 1.2 : r < 0.92 ? 1.8 : r < 0.985 ? 2.6 : 3.4;
      const opacity = 0.2 + Math.random() * 0.7;
      const twinkle = Math.random() < 0.3;
      return {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        opacity,
        tint: TINTS[Math.floor(Math.random() * TINTS.length)],
        twinkle,
        twinkleDuration: 1200 + Math.random() * 2800,
        twinkleDelay: Math.random() * 3000,
        twinkleMin: Math.max(0.05, opacity - 0.25 - Math.random() * 0.3),
      };
    });
  }, [count]);

  return (
    <View style={styles.container} pointerEvents="none">
      {stars.map((s, i) =>
        s.twinkle ? (
          <TwinklingStar key={i} star={s} />
        ) : (
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
        ),
      )}
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
