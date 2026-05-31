import React, { useState, useEffect } from 'react';
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
  values: string[];
  options: Option[];
  onChange: (values: string[]) => void;
};

const AdminMultiSelectDropdownField: React.FC<Props> = ({
  label,
  values,
  options,
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    document.addEventListener('click', close);

    return () => document.removeEventListener('click', close);
  }, [open]);

  const toggleItem = (key: string) => {
    if (values.includes(key)) {
      onChange(values.filter((v) => v !== key));
    } else {
      onChange([...values, key]);
    }
  };

  const labelText =
    values.length === 0
      ? 'Select'
      : values.length === options.length
      ? 'All Selected'
      : `${values.length} selected`;

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={styles.input}
        onPress={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
      >
        <Text>{labelText}</Text>
      </TouchableOpacity>

      {open && (
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <ScrollView>
              {options.map((item) => {
                const selected = values.includes(item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.option}
                    onPress={() => toggleItem(item.key)}
                  >
                    <Text style={{ fontWeight: selected ? 'bold' : 'normal' }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      )}
    </View>
  );
};

export default React.memo(AdminMultiSelectDropdownField);

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
  },

  option: {
    padding: 12,
  },
});