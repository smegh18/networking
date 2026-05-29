import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { borderRadius, colors } from '../../theme';

const QRCodeGenerator = require('qrcode-terminal/vendor/QRCode');
const QRErrorCorrectLevel = require('qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel');

interface QrCodeProps {
  value: string;
  size?: number;
}

function buildMatrix(value: string): boolean[][] {
  const qr = new QRCodeGenerator(-1, QRErrorCorrectLevel.M);
  qr.addData(value);
  qr.make();

  const quietZone = 2;
  const count = qr.getModuleCount();
  const width = count + quietZone * 2;
  const matrix = Array.from({ length: width }, () => Array.from({ length: width }, () => false));

  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      matrix[row + quietZone][col + quietZone] = qr.isDark(row, col);
    }
  }

  return matrix;
}

export const QrCode: React.FC<QrCodeProps> = ({
  value,
  size = 220,
}) => {
  const matrix = useMemo(() => buildMatrix(value), [value]);

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {matrix.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((isDark, colIndex) => (
            <View
              key={`cell-${rowIndex}-${colIndex}`}
              style={[
                styles.cell,
                { backgroundColor: isDark ? colors.text : colors.surface },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
  },
});
