import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import dayjs from 'dayjs'
import { SYMPTOM_CATEGORIES } from './symptomCategories'

const generateReportHTML = ({ userProfile, cycleSettings, dailyLogs, installDate }) => {
  const cycleLength = cycleSettings?.cycleLength || 28
  const periodLength = cycleSettings?.periodLength || 5
  const lutealLength = cycleSettings?.lutealLength || 14
  const lastPeriodStart = cycleSettings?.lastPeriodStart || dayjs().format('YYYY-MM-DD')
  const lpsDate = dayjs(lastPeriodStart)
  const today = dayjs()

  // Build cycle history
  const cycles = []
  const start = installDate ? dayjs(installDate) : lpsDate
  let cursor = lpsDate
  while (cursor.isBefore(today)) {
    if (cursor.isAfter(start) || cursor.isSame(start, 'day')) {
      cycles.push({
        start: cursor.format('MMM D, YYYY'),
        end: cursor.add(periodLength - 1, 'day').format('MMM D, YYYY'),
        ovulation: cursor.add(cycleLength - lutealLength, 'day').format('MMM D, YYYY'),
        length: cycleLength,
      })
    }
    cursor = cursor.add(cycleLength, 'day')
  }
  const recentCycles = cycles.reverse().slice(0, 6)

  // Build last 30 days of logs
  const recentLogs = []
  if (dailyLogs) {
    Object.entries(dailyLogs)
      .filter(([date]) => dayjs(date).isAfter(today.subtract(30, 'day')))
      .sort((a, b) => dayjs(b[0]).diff(dayjs(a[0])))
      .forEach(([date, log]) => recentLogs.push({ date, ...log }))
  }

  // Symptom frequency (merges flat list + detailed categorized symptoms)
  const allDetailedSymptoms = SYMPTOM_CATEGORIES.flatMap(c => c.items)
  const getSymptomLabel = (id) => {
    const item = allDetailedSymptoms.find(s => s.id === id)
    return item ? item.label : id
  }
  const symptomCount = {}
  Object.values(dailyLogs || {}).forEach(log => {
    (log.symptoms || []).forEach(s => {
      symptomCount[s] = (symptomCount[s] || 0) + 1
    })
    ;(log.symptomsDetailed || []).forEach(id => {
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
          <h1>🌸 CycleApp Health Report</h1>
          <p>Generated on ${today.format('MMMM D, YYYY')}</p>
        </div>

        <div class="section">
          <div class="section-title">Patient Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Name</div>
              <div class="info-value">${userProfile?.name || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Age</div>
              <div class="info-value">${age ? age + ' years' : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Health Condition</div>
              <div class="info-value">${userProfile?.condition && userProfile.condition !== 'none' ? userProfile.condition : 'None reported'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Cycle Profile</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Average Cycle Length</div>
              <div class="info-value">${cycleLength} days</div>
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
              <div class="info-value">${lpsDate.format('MMM D, YYYY')}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Recent Cycle History (${recentCycles.length} cycles)</div>
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
                <td>${c.length} days</td>
              </tr>
            `).join('')}
          </table>
        </div>

        <div class="section">
          <div class="section-title">Most Common Symptoms</div>
          ${topSymptoms.length === 0
            ? '<p style="color:#9CA3AF;">No symptoms logged yet</p>'
            : topSymptoms.map(([symptom, count]) =>
                `<span class="symptom-tag">${symptom} (${count}x)</span>`
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
              <th>Sleep</th>
            </tr>
            ${recentLogs.length === 0
              ? '<tr><td colspan="6" style="text-align:center;color:#9CA3AF;">No logs in the last 30 days</td></tr>'
              : recentLogs.map(log => `
                <tr>
                  <td>${dayjs(log.date).format('MMM D')}</td>
                  <td>${log.flow && log.flow !== 'none' ? log.flow : '—'}</td>
                  <td>${(log.moods || []).join(', ') || '—'}</td>
                  <td>${[...(log.symptoms || []), ...((log.symptomsDetailed || []).map(getSymptomLabel))].join(', ') || '—'}</td>
                  <td>${log.water ? log.water + '/8' : '—'}</td>
                  <td>${log.sleep ? log.sleep + 'h' : '—'}</td>
                </tr>
              `).join('')}
          </table>
        </div>

        <div class="footer">
          This report was generated by CycleApp for informational purposes.
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
    const { uri } = await Print.printToFileAsync({ html, base64: false })

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