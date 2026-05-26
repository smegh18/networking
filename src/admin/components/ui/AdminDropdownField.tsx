import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

type Option = {
  key: string;
  label: string;
};

type Props = {
  label?: string;
  value: string;
  options: Option[];
  onSelect: (value: string) => void;
};

const AdminDropdownField: React.FC<Props> = ({
  label,
  value,
  options,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<View>(null);

  // Close on outside click (WEB FIX)
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = () => {
      setOpen(false);
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [open]);

  const selectedLabel =
    options.find((o) => o.key === value)?.label || 'Select';

  return (
    <View style={styles.wrapper} ref={wrapperRef}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={styles.input}
        activeOpacity={0.8}
        onPress={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <Text style={styles.value}>{selectedLabel}</Text>
      </TouchableOpacity>

      {open && (
        <Pressable
          style={styles.overlay}
          onPress={() => setOpen(false)}
        >
          <View
            style={styles.dropdown}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView nestedScrollEnabled>
              {options.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.option}
                  onPress={() => {
                    onSelect(item.key);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      )}
    </View>
  );
};

export default React.memo(AdminDropdownField);

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
  },
  label: {
    marginBottom: 6,
    fontSize: 13,
    color: '#666',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  value: {
    fontSize: 14,
  },

  // FULLSCREEN overlay (prevents layout shift)
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },

  dropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 250,
    elevation: 5,
  },

  option: {
    padding: 12,
  },
  optionText: {
    fontSize: 14,
  },
});