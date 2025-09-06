import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function ImageCarousel({ 
  images = [], 
  height = 200, 
  autoPlay = true,
  autoPlayInterval = 3000,
  showIndicators = true,
  onPress,
  renderOverlay,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (autoPlay && images.length > 1) {
      startAutoPlay();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [images, autoPlay]);

  const startAutoPlay = () => {
    intervalRef.current = setInterval(() => {
      if (scrollViewRef.current) {
        const nextIndex = (activeIndex + 1) % images.length;
        scrollViewRef.current.scrollTo({
          x: nextIndex * screenWidth,
          animated: true,
        });
        setActiveIndex(nextIndex);
      }
    }, autoPlayInterval);
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);
    setActiveIndex(index);
  };

  const handleMomentumScrollEnd = () => {
    if (autoPlay && images.length > 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      startAutoPlay();
    }
  };

  if (!images || images.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No images available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {images.map((image, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={onPress ? 0.8 : 1}
            onPress={() => onPress && onPress(index, image)}
            style={{ width: screenWidth, height }}
          >
            <Image
              source={{ uri: image.url || image }}
              style={[styles.image, { height }]}
              resizeMode="cover"
            />
            {renderOverlay && renderOverlay(image, index)}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {showIndicators && images.length > 1 && (
        <View style={styles.indicatorContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === activeIndex && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: screenWidth,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#ffffff',
    width: 20,
  },
});