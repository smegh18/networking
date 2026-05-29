import { useState, useEffect } from 'react';
import { Keyboard, Dimensions, Platform } from 'react-native';

const DEFAULT_DROPDOWN_MAX = 250;
const RESERVE_ABOVE_KEYBOARD = 240;
const MIN_DROPDOWN_HEIGHT = 100;

/**
 * Returns current keyboard height in px (0 when closed).
 * Use with dropdown lists so their maxHeight shrinks when keyboard is open on mobile.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setHeight(e.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/**
 * Returns a maxHeight value for dropdown lists that shrinks when keyboard is open,
 * so the dropdown stays above the keyboard on mobile (especially Android).
 * @param defaultMax - max height when keyboard is closed (e.g. 180, 250, 300)
 */
export function useDropdownMaxHeight(defaultMax: number = DEFAULT_DROPDOWN_MAX): number {
  const keyboardHeight = useKeyboardHeight();
  const [maxHeight, setMaxHeight] = useState(defaultMax);

  useEffect(() => {
    if (keyboardHeight === 0) {
      setMaxHeight(defaultMax);
      return;
    }
    const windowHeight = Dimensions.get('window').height;
    const spaceAbove = windowHeight - keyboardHeight - RESERVE_ABOVE_KEYBOARD;
    const next = Math.min(defaultMax, Math.max(MIN_DROPDOWN_HEIGHT, spaceAbove));
    setMaxHeight(next);
  }, [keyboardHeight, defaultMax]);

  return maxHeight;
}
