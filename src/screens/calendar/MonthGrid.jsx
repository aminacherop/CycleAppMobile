import { memo } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { AppText, Icon, DayCircle } from '../../components/ui'

// Marker kind for a day from engine dayInfo. Past days only carry logged
// period data (the engine never predicts periods before today).
export const markerKind = (info) => {
  if (!info) return null
  if (info.isPeriod) return 'period'
  if (info.isPredictedPeriod) return 'predicted'
  if (info.isOvulation) return 'ovulation'
  if (info.isFertile) return 'fertile'
  return null
}

const MARKER_ICON = { period: 'drop', predicted: 'drop', fertile: 'leaf', ovulation: 'egg' }

/** Small icon shown under the date number (also used by the legend). */
export const DayMarkerIcon = memo(({ kind, size = 10 }) => {
  const { colors } = useTheme()
  if (!kind) return <View style={{ width: size, height: size }} />
  const color = kind === 'fertile' ? colors.fertile : kind === 'ovulation' ? colors.ovulation : colors.period
  return (
    <View style={{ opacity: kind === 'predicted' ? 0.45 : 1 }}>
      <Icon name={MARKER_ICON[kind]} size={size} color={color} />
    </View>
  )
})

/** Cycle-day number shown next to the marker, tinted to match the marker. */
export const CycleDayNum = memo(({ n, kind }) => {
  const { colors } = useTheme()
  if (!n) return null
  const color = kind === 'fertile' ? colors.fertile
    : kind === 'ovulation' ? colors.ovulation
      : kind ? colors.period : colors.textFaint
  return (
    <AppText
      variant="small"
      color={color}
      style={{ fontSize: 9, lineHeight: 12, fontWeight: kind ? '700' : '600', opacity: kind === 'predicted' ? 0.55 : kind ? 0.9 : 0.8 }}
      maxFontSizeMultiplier={1}
      numberOfLines={1}
    >
      {n}
    </AppText>
  )
})

// Faint inner grid lines: each cell draws its right/bottom edge unless it
// sits in the last column/row, so the card edge stays the only frame.
export const gridLines = (lastCol, lastRow, color) => ({
  borderColor: color,
  borderRightWidth: lastCol ? 0 : StyleSheet.hairlineWidth,
  borderBottomWidth: lastRow ? 0 : StyleSheet.hairlineWidth,
})

/**
 * One calendar day. Primitive props only so React.memo skips cells whose
 * state didn't change (e.g. when only the selection moves).
 */
export const DayCell = memo(({
  date, dayNum, kind, cycleDay, isToday, isSelected, hasLog, cellW, circle, lastCol, lastRow, onPress, label,
}) => {
  const { colors } = useTheme()
  let fill = 'transparent'
  let stroke = null
  let numColor = colors.text
  let weight = '600'
  if (kind === 'period') {
    fill = colors.period
    numColor = '#FFFFFF'
    weight = '800'
  } else if (kind === 'predicted') {
    stroke = colors.period
    numColor = colors.period
    weight = '700'
  } else if (kind === 'ovulation') {
    fill = colors.ovulationSoft
    numColor = colors.ovulation
    weight = '800'
  } else if (kind === 'fertile') {
    numColor = colors.fertile
    weight = '800'
  }
  const ring = circle + 6
  return (
    <Pressable
      onPress={() => onPress?.(date)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isSelected }}
      style={[
        styles.cell,
        { width: cellW },
        gridLines(lastCol, lastRow, colors.border),
        isSelected && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View
        style={[
          styles.center,
          { width: ring, height: ring, borderRadius: ring / 2, borderWidth: 2, borderColor: isToday ? colors.text : 'transparent' },
        ]}
      >
        <DayCircle size={circle} fill={fill} stroke={stroke} dashed={!!stroke}>
          <AppText variant="caption" color={numColor} style={{ fontWeight: weight, fontSize: circle >= 40 ? 16 : 14.5 }} maxFontSizeMultiplier={1.15}>
            {dayNum}
          </AppText>
        </DayCircle>
        {hasLog ? <View style={[styles.logDot, { backgroundColor: colors.primary, borderColor: colors.surface }]} /> : null}
      </View>
      <View style={styles.markerRow}>
        {kind ? <DayMarkerIcon kind={kind} size={10} /> : null}
        <CycleDayNum n={cycleDay} kind={kind} />
      </View>
    </Pressable>
  )
})

export const WeekdayRow = memo(({ labels, cellW }) => (
  <View style={styles.row}>
    {labels.map((l, i) => (
      <View key={i} style={{ width: cellW, alignItems: 'center' }}>
        <AppText variant="small" faint numberOfLines={1}>{l}</AppText>
      </View>
    ))}
  </View>
))

/**
 * Month grid. `weeks` comes from getMonthGrid. Only the cells whose props
 * changed re-render when `selected` moves.
 */
export const MonthGrid = memo(({ weeks, selected, today, logDays, cellW, circle, onPress, formatLabel }) => {
  const { colors } = useTheme()
  const rows = weeks || []
  return (
    <View>
      {rows.map((week, wi) => {
        const lastRow = wi === rows.length - 1
        return (
          <View key={wi} style={styles.row}>
            {(week || []).map((info, di) => {
              const lastCol = di === 6
              if (!info) {
                return <View key={`b${di}`} style={[{ width: cellW }, gridLines(lastCol, lastRow, colors.border)]} />
              }
              const d = info.date
              const cycleDay = Number.isFinite(info.cycleDay) && info.cycleDay > 0 ? info.cycleDay : null
              return (
                <DayCell
                  key={d}
                  date={d}
                  dayNum={Number(d.slice(8, 10))}
                  kind={markerKind(info)}
                  cycleDay={cycleDay}
                  isToday={d === today}
                  isSelected={d === selected}
                  hasLog={!!logDays?.has(d)}
                  cellW={cellW}
                  circle={circle}
                  lastCol={lastCol}
                  lastRow={lastRow}
                  onPress={onPress}
                  label={formatLabel ? formatLabel(d, cycleDay) : d}
                />
              )
            })}
          </View>
        )
      })}
    </View>
  )
})

export const Legend = memo(({ t }) => {
  const items = [
    { kind: 'period', label: t('cal_legend_period') },
    { kind: 'predicted', label: t('cal_legend_predicted') },
    { kind: 'fertile', label: t('cal_legend_fertile') },
    { kind: 'ovulation', label: t('cal_legend_ovulation') },
  ]
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.kind} style={styles.legendItem}>
          <DayMarkerIcon kind={it.kind} size={13} />
          <AppText variant="small" muted numberOfLines={1}>{it.label}</AppText>
        </View>
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', paddingVertical: 4 },
  center: { alignItems: 'center', justifyContent: 'center' },
  markerRow: { height: 14, marginTop: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  logDot: { position: 'absolute', top: 1, right: 1, width: 7, height: 7, borderRadius: 4, borderWidth: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 16, rowGap: 6, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
})
