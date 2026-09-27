import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleProp, View, ViewStyle } from 'react-native';

export default function FlipCard({ revealed, onFlip, style, children }: {
  revealed: boolean;
  onFlip: () => void;
  style: StyleProp<ViewStyle>;
  children: (showAnswer: boolean) => ReactNode;
}) {
  const rotation = useRef(new Animated.Value(0)).current;
  const [showAnswer, setShowAnswer] = useState(revealed);
  const shown = useRef(revealed);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [faceHeights, setFaceHeights] = useState([0, 0]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    rotation.stopAnimation();
    if (reduceMotion) {
      shown.current = revealed;
      setShowAnswer(revealed);
      rotation.setValue(0);
      return;
    }
    const timing = (toValue: number, easing: (value: number) => number) => Animated.timing(rotation, {
      toValue, duration: 220, easing, useNativeDriver: Platform.OS !== 'web',
    });
    if (shown.current === revealed) {
      timing(0, Easing.out(Easing.cubic)).start();
    } else {
      const direction = revealed ? 1 : -1;
      timing(direction * 90, Easing.in(Easing.cubic)).start(({ finished }) => {
        if (!finished) return;
        // Swap the text only while the card is edge-on, so it never appears mirrored.
        shown.current = revealed;
        setShowAnswer(revealed);
        rotation.setValue(-direction * 90);
        timing(0, Easing.out(Easing.cubic)).start();
      });
    }
    return () => rotation.stopAnimation();
  }, [revealed, reduceMotion, rotation]);

  return <View style={{ width: '100%' }}>
    {/* Measure both faces at the available width before flipping. Long words and
        larger text can grow the card, but turning it never changes its size. */}
    {[false, true].map((answer, index) => <View
      key={String(answer)} pointerEvents="none" aria-hidden accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[style, { position: 'absolute', top: 0, left: 0, width: '100%', opacity: 0 }]}
      onLayout={event => {
        const height = Math.ceil(event.nativeEvent.layout.height);
        setFaceHeights(current => current[index] === height ? current : current.map((value, i) => i === index ? height : value));
      }}
    >{children(answer)}</View>)}
    <Pressable accessibilityRole="button" accessibilityLabel={showAnswer ? 'Hide answer' : 'Reveal answer'} onPress={onFlip}>
    <Animated.View testID="flipping-card" style={[style, { height: Math.max(...faceHeights) || undefined, transform: [{ perspective: 1200 }, { rotateY: rotation.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) }] }]}>
      {children(showAnswer)}
    </Animated.View>
    </Pressable>
  </View>;
}
