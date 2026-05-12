import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StarfieldBg } from '../home/StarfieldBg';
import { colors, radii, spacing } from '../shared/theme';
import { ChatBubbleIcon, CpuIcon, ShieldIcon, WifiOffIcon } from '../shared/icons';
import { storage, KEYS } from '../shared/persistence';
import { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const { width: SCREEN_W } = Dimensions.get('window');

interface Page {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const PAGES: Page[] = [
  {
    icon: <ChatBubbleIcon size={44} color={colors.accent} />,
    title: 'Welcome to ArcanAI',
    subtitle: 'Your personal AI assistant that runs entirely on your device. No accounts, no subscriptions, no cloud.',
  },
  {
    icon: <WifiOffIcon size={44} color={colors.accent} />,
    title: 'No Internet Required',
    subtitle: 'Every conversation happens locally on your iPhone. Use ArcanAI anywhere — on a plane, off the grid, wherever.',
  },
  {
    icon: <ShieldIcon size={44} color={colors.accent} />,
    title: '100% Private',
    subtitle: 'Your messages never leave your device. No data collection, no telemetry, no servers. Your conversations are yours alone.',
  },
  {
    icon: <CpuIcon size={44} color={colors.accent} />,
    title: 'Bring Your Own Model',
    subtitle: 'Import any GGUF model from Hugging Face. Choose the size and capability that fits your device.',
  },
];

export function OnboardingScreen() {
  const nav = useNavigation<Nav>();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const exitAnim = useRef(new Animated.Value(0)).current;
  const [exiting, setExiting] = useState(false);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLast = activeIndex === PAGES.length - 1;

  const finishOnboarding = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    storage.set(KEYS.onboardingDone, true);
    Animated.timing(exitAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      nav.reset({ index: 0, routes: [{ name: 'Home' }] });
    });
  }, [exiting, exitAnim, nav]);

  const onNext = () => {
    if (isLast) {
      finishOnboarding();
    } else {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  const onSkip = () => {
    finishOnboarding();
  };

  const contentOpacity = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const contentScale = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StarfieldBg count={200} />

      <Animated.View
        style={[
          styles.animWrap,
          { opacity: contentOpacity, transform: [{ scale: contentScale }] },
        ]}>
        <View style={styles.skipRow}>
          {!isLast ? (
            <Pressable onPress={onSkip} hitSlop={12} disabled={exiting}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        <FlatList
          ref={listRef}
          data={PAGES}
          horizontal
          pagingEnabled
          scrollEnabled={!exiting}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }) => (
            <View style={styles.page}>
              {index === 0 ? (
                <Image
                  source={require('../../assets/clipped_logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.iconCircle}>
                  {item.icon}
                </View>
              )}
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          )}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {PAGES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={onNext}
            disabled={exiting}
            style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}>
            <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Continue'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  animWrap: { flex: 1 },

  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  skipText: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '600',
  },

  page: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl + spacing.lg,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: spacing.xl,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(138, 107, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(138, 107, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: spacing.md,
    textShadowColor: 'rgba(138, 107, 255, 0.4)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dotActive: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  nextBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: { opacity: 0.85 },
  nextText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
