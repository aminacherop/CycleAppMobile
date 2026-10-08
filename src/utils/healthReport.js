import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import dayjs from 'dayjs'
import { SYMPTOM_CATEGORIES, getSymptomLabel as getLabel } from './symptomCategories'
import { buildPeriodDaysFromLegacy, getCycleHistory, getCycleState } from './cycleEngine'

// Escape user-provided text before putting it in the report HTML.
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const fmt = (d) => (d ? dayjs(d).format('MMM D, YYYY') : '—')

const generateReportHTML = ({ userProfile, cycleSettings, dailyLogs, periodDays }) => {
  const today = dayjs()
  const todayStr = today.format('YYYY-MM-DD')
  // Real history: periodDays from the app, or rebuilt from logs for legacy callers.
  const days = Array.isArray(periodDays) ? periodDays : buildPeriodDaysFromLegacy(dailyLogs, cycleSettings, todayStr)
  const state = getCycleState(days, cycleSettings, todayStr)
  const history = getCycleHistory(days, cycleSettings, todayStr)
  const averages = state.averages
  const cycleLength = averages.cycleLength
  const periodLength = averages.periodLength
  const lutealLength = averages.lutealLength
  const averagesNote = averages.source === 'learned'
    ? `Learned from ${averages.cyclesUsed} logged cycles`
    : 'Based on user settings (not enough logged cycles yet)'

  const recentCycles = [
    ...(history.current ? [{
      start: fmt(history.current.start),
      end: fmt(history.current.end),
      ovulation: state.isLate ? '—' : `${fmt(state.ovulationDate)} (est.)`,
      length: state.isLate ? `In progress — ${state.daysLate} days late` : `In progress (day ${state.cycleDay})`,
    }] : []),
    ...history.completed.slice().reverse().map(c => ({
      start: fmt(c.start),
      end: fmt(c.end),
      ovulation: `${fmt(c.ovulationDate)} (est.)`,
      length: `${c.cycleLength} days`,
    })),
  ].slice(0, 7)

  // Build last 30 days of logs
  const recentLogs = []
  if (dailyLogs) {
    Object.entries(dailyLogs)
      .filter(([date]) => dayjs(date).isAfter(today.subtract(30, 'day')))
      .sort((a, b) => dayjs(b[0]).diff(dayjs(a[0])))
      .forEach(([date, log]) => recentLogs.push({ ...log, date }))
  }
  // Only show the Sleep column if sleep was actually logged.
  const showSleep = recentLogs.some(l => l.sleep != null && l.sleep !== '' && Number(l.sleep) > 0)
  const columnCount = showSleep ? 11 : 10
  const join = (arr) => (Array.isArray(arr) ? arr : []).map(esc).join(', ')

  // Symptom frequency (merges flat list + detailed categorized symptoms)
  const allDetailedSymptoms = SYMPTOM_CATEGORIES.flatMap(c => c.items)
  const getSymptomLabel = (id) => {
    const item = allDetailedSymptoms.find(s => s.id === id)
    return item ? getLabel(item, 'en') : id
  }
  const symptomCount = {}
  const list = (x) => (Array.isArray(x) ? x.filter(v => typeof v === 'string') : [])
  Object.values(dailyLogs || {}).forEach(log => {
    if (!log || typeof log !== 'object') return
    list(log.symptoms).forEach(s => {
      symptomCount[s] = (symptomCount[s] || 0) + 1
    })
    ;list(log.symptomsDetailed).forEach(id => {
      const label = getSymptomLabel(id)
      symptomCount[label] = (symptomCount[label] || 0) + 1
    })
  })
  const topSymptoms = Object.entries(symptomCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const age = userProfile?.dob
    ? dayjs().diff(dayjs(userProfile.dob), 'year')
    : null

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: -apple-system, Helvetica, Arial, sans-serif;
            color: #1A1A2E;
            padding: 32px;
            font-size: 13px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #C2527A;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .header h1 {
            color: #C2527A;
            font-size: 24px;
            margin: 0 0 4px;
          }
          .header p { color: #6B7280; margin: 0; }
          .section {
            margin-bottom: 24px;
          }
          .section-title {
            font-size: 15px;
            font-weight: 700;
            color: #9A3A5C;
            border-bottom: 1px solid #F2E4EA;
            padding-bottom: 6px;
            margin-bottom: 10px;
          }
          .info-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .info-item {
            background: #FEF2F6;
            border-radius: 8px;
            padding: 10px 14px;
            min-width: 140px;
          }
          .info-label { color: #6B7280; font-size: 11px; }
          .info-value { font-weight: 700; font-size: 14px; color: #1A1A2E; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th, td {
            border: 1px solid #F2E4EA;
            padding: 8px 10px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background: #F8DDE6;
            color: #9A3A5C;
            font-weight: 700;
          }
          .symptom-tag {
            display: inline-block;
            background: #FEF3C7;
            color: #92400E;
            padding: 4px 10px;
            border-radius: 12px;
            margin: 3px;
            font-size: 11px;
          }
          .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #F2E4EA;
            color: #9CA3AF;
            font-size: 10px;
            text-align: center;
          }
        </style>
      </head>
      <body>

        <div class="header">
          <h1>🌸 My Cycle: Period Tracker Health Report</h1>
          <p>Generated on ${today.format('MMMM D, YYYY')}</p>
        </div>

        <div class="section">
          <div class="section-title">Patient Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Name</div>
              <div class="info-value">${esc(userProfile?.name) || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Age</div>
              <div class="info-value">${age ? age + ' years' : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Health Condition</div>
              <div class="info-value">${userProfile?.condition && userProfile.condition !== 'none' ? esc(userProfile.condition) : 'None reported'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Cycle Profile</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Average Cycle Length</div>
              <div class="info-value">${cycleLength} days</div>
              <div class="info-label">${esc(averagesNote)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Average Period Length</div>
              <div class="info-value">${periodLength} days</div>
            </div>
            <div class="info-item">
              <div class="info-label">Luteal Phase Length</div>
              <div class="info-value">${lutealLength} days</div>
            </div>
            <div class="info-item">
              <div class="info-label">Last Period Start</div>
              <div class="info-value">${fmt(state.lastPeriodStart)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${state.isLate ? 'Period Status' : 'Next Period (est.)'}</div>
              <div class="info-value">${!state.hasData ? '—' : state.isLate ? `${state.daysLate} days late` : fmt(state.nextPeriodStart)}</div>
            </div>
            ${averages.regularity != null ? `
            <div class="info-item">
              <div class="info-label">Regularity Score</div>
              <div class="info-value">${averages.regularity}/100</div>
            </div>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Recent Cycle History (${recentCycles.length} cycles)</div>
          ${recentCycles.length === 0 ? '<p style="color:#9CA3AF;">No periods logged yet</p>' : ''}
          <table>
            <tr>
              <th>Period Start</th>
              <th>Period End</th>
              <th>Ovulation Est.</th>
              <th>Cycle Length</th>
            </tr>
            ${recentCycles.map(c => `
              <tr>
                <td>${c.start}</td>
                <td>${c.end}</td>
                <td>${c.ovulation}</td>
                <td>${c.length}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div class="section">
          <div class="section-title">Most Common Symptoms</div>
          ${topSymptoms.length === 0
            ? '<p style="color:#9CA3AF;">No symptoms logged yet</p>'
            : topSymptoms.map(([symptom, count]) =>
                `<span class="symptom-tag">${esc(symptom)} (${count}x)</span>`
              ).join('')}
        </div>

        <div class="section">
          <div class="section-title">Daily Log Summary (Last 30 Days)</div>
          <table>
            <tr>
              <th>Date</th>
              <th>Flow</th>
              <th>Mood</th>
              <th>Symptoms</th>
              <th>Water</th>
              ${showSleep ? '<th>Sleep</th>' : ''}
              <th>Mucus</th>
              <th>Weight</th>
              <th>Intimacy</th>
              <th>BBT</th>
              <th>Preg. Test</th>
            </tr>
            ${recentLogs.length === 0
              ? `<tr><td colspan="${columnCount}" style="text-align:center;color:#9CA3AF;">No logs in the last 30 days</td></tr>`
              : recentLogs.map(log => `
                <tr>
                  <td>${dayjs(log.date).format('MMM D')}</td>
                  <td>${log.flow && log.flow !== 'none' ? esc(log.flow) : '—'}</td>
                  <td>${join(log.moods) || '—'}</td>
                  <td>${join([...list(log.symptoms), ...list(log.symptomsDetailed).map(getSymptomLabel)]) || '—'}</td>
                  <td>${log.water ? esc(log.water) + '/8' : '—'}</td>
                  ${showSleep ? `<td>${log.sleep ? esc(log.sleep) + 'h' : '—'}</td>` : ''}
                  <td>${esc(log.mucus) || '—'}</td>
                  <td>${log.weight ? esc(log.weight) + 'kg' : '—'}</td>
                  <td>${esc(log.intimacy) || '—'}</td>
                  <td>${log.bbt ? esc(log.bbt) + '°C' : '—'}</td>
                  <td>${log.pregnancyTest && log.pregnancyTest !== 'notaken' ? esc(log.pregnancyTest) : '—'}</td>
                </tr>
              `).join('')}
          </table>
        </div>

        <div class="footer">
          This report was generated by My Cycle: Period Tracker for informational purposes.
          It does not constitute medical advice. Please consult a qualified
          healthcare provider for diagnosis and treatment.
        </div>

      </body>
    </html>
  `
}

export const generateAndShareReport = async (data) => {
  try {
    const html = generateReportHTML(data)
    const { uri: printedUri } = await Print.printToFileAsync({ html, base64: false })

    // Give the file a readable name (the printer returns a random UUID name),
    // since it ends up attached to emails and chats to doctors.
    let uri = printedUri
    try {
      const named = new File(Paths.cache, `MyCycle-Report-${dayjs().format('YYYY-MM-DD')}.pdf`)
      if (named.exists) named.delete()
      new File(printedUri).copy(named)
      uri = named.uri
    } catch {
      uri = printedUri
    }

    const isAvailable = await Sharing.isAvailableAsync()
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share or print your health report',
        UTI: 'com.adobe.pdf',
      })
    }
    return { success: true }
  } catch (err) {
    console.error('Report generation error:', err)
    return { success: false, error: err.message }
  }
}

export const printReport = async (data) => {
  try {
    const html = generateReportHTML(data)
    await Print.printAsync({ html })
    return { success: true }
  } catch (err) {
    console.error('Print error:', err)
    return { success: false, error: err.message }
  }
}