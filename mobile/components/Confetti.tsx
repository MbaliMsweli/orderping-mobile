import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const COLORS = ['#1A56E8', '#25D366', '#FBBF24', '#8B5CF6', '#F87171', '#34D399'];
const COUNT  = 22;

function randomBetween(a: number, b: number) { return a + Math.random() * (b - a); }

export default function Confetti({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const particles = useRef(
    Array.from({ length: COUNT }, () => ({
      x:     randomBetween(0, width - 12),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      drift: randomBetween(-40, 40),
      anim:  new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;
    particles.forEach(p => p.anim.setValue(0));
    Animated.parallel(
      particles.map(p =>
        Animated.timing(p.anim, { toValue: 1, duration: 2200, useNativeDriver: true })
      )
    ).start(() => onDone());
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, height * 0.65] });
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] });
        const opacity    = p.anim.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', top: 0, left: p.x,
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: p.color,
              transform: [{ translateY }, { translateX }],
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}
