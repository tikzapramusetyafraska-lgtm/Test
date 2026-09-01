import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { COLORS } from "@/src/theme";
import { formatShortIDR } from "@/src/utils/finance";

export type BarDatum = { label: string; value: number; color?: string };

export function BarChart({
  data,
  height = 140,
  color = COLORS.green,
  testID,
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  testID?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = 6;
  return (
    <View testID={testID} style={{ height: height + 24 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap }}>
        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max(6, (d.value / max) * height) : 4;
          return (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: "100%",
                  maxWidth: 32,
                  height: h,
                  backgroundColor: d.value > 0 ? d.color || color : COLORS.border,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", marginTop: 6, gap }}>
        {data.map((d, i) => (
          <Text key={i} style={styles.barLabel} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export type PieDatum = { label: string; value: number; color: string };

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
};

export function DonutChart({
  data,
  size = 180,
  strokeWidth = 26,
  centerLabel,
  centerValue,
  testID,
}: {
  data: PieDatum[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  testID?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const inner = r - strokeWidth;
  if (total === 0) {
    return (
      <View testID={testID} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r - 1} fill={COLORS.card} stroke={COLORS.border} strokeWidth={1} />
          <Circle cx={cx} cy={cy} r={inner} fill={COLORS.bg} />
        </Svg>
        <View style={StyleSheet.absoluteFillObject as any}>
          <View style={styles.donutCenter}>
            <Text style={styles.donutEmpty}>Belum ada data</Text>
          </View>
        </View>
      </View>
    );
  }
  let cursor = 0;
  const slices = data.map((d) => {
    const angle = (d.value / total) * 360;
    const path = arcPath(cx, cy, r, cursor, cursor + angle);
    cursor += angle;
    return { d, path };
  });
  return (
    <View testID={testID} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((s, i) => (
            <Path key={i} d={s.path} fill={s.d.color} />
          ))}
        </G>
        <Circle cx={cx} cy={cy} r={inner} fill={COLORS.bg} />
      </Svg>
      <View style={StyleSheet.absoluteFillObject as any}>
        <View style={styles.donutCenter}>
          {centerLabel && <Text style={styles.donutLabel}>{centerLabel}</Text>}
          {centerValue && <Text style={styles.donutValue}>{centerValue}</Text>}
        </View>
      </View>
    </View>
  );
}

export function ScoreGauge({
  score,
  size = 180,
  strokeWidth = 14,
  color,
  testID,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  testID?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;
  return (
    <View testID={testID} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          <Circle cx={cx} cy={cy} r={r} stroke={COLORS.border} strokeWidth={strokeWidth} fill="transparent" />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            fill="transparent"
          />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFillObject as any}>
        <View style={styles.donutCenter}>
          <Text style={{ color: COLORS.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800" }}>SKOR</Text>
          <Text style={{ color: COLORS.text, fontSize: 34, fontWeight: "800", letterSpacing: -1 }}>{clamped}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barLabel: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 10,
    textAlign: "center",
  },
  donutCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  donutLabel: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },
  donutValue: { color: COLORS.text, fontSize: 15, fontWeight: "800", marginTop: 4, textAlign: "center", paddingHorizontal: 6 },
  donutEmpty: { color: COLORS.muted, fontSize: 12 },
});

// Marker to silence unused-import warning for helper types
export const _formatter = formatShortIDR;
export const _R = Rect; // ensure react-native-svg tree-shakes properly
