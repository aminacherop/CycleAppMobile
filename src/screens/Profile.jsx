import { useState } from 'react'
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Modal,
} from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { usePremium } from '../context/PremiumContext'

const Profile = ({ cycleSettings, setCycleSettings, userProfile, setUserProfile, resetAllData, navigation }) => {
    const { colors, isDark, changeTheme, theme } = useTheme()
    const { language, changeLanguage, t } = useLanguage()
    const { isPremium, subscription, cancelPremium } = usePremium()

    const [activeTab, setActiveTab] = useState('profile')
    const [isEditing, setIsEditing] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const [profile, setProfile] = useState({
        name: userProfile?.name || '',
        dob: userProfile?.dob || '',
        email: userProfile?.email || '',
        phone: userProfile?.phone || '',
        condition: userProfile?.condition || 'none',
    })
    const [draftProfile, setDraftProfile] = useState({ ...profile })

    const cycleLength = cycleSettings?.cycleLength || 28
    const periodLength = cycleSettings?.periodLength || 5
    const lastPeriodStart = cycleSettings?.lastPeriodStart || dayjs().format('YYYY-MM-DD')
    const lpsDate = dayjs(lastPeriodStart)

    const nextPeriodDate = lpsDate.add(cycleLength, 'day')
    const daysUntilNext = Math.max(0, nextPeriodDate.diff(dayjs(), 'day'))

    const generateHistory = () => {
      const history = []
      for (let i = 5; i >= 0; i--) {
        const start = lpsDate.subtract(i * cycleLength, 'day')
        const end = start.add(periodLength - 1, 'day')
        const nextStart = start.add(cycleLength, 'day')
        history.push({
          cycleNum: 6 - i,
          periodStart: start.format('MMM D, YYYY'),
          periodEnd: end.format('MMM D, YYYY'),
          periodLength,
          cycleLength,
          ovulation: start.add(cycleLength - 14, 'day').format('MMM D'),
          fertileStart: start.add(cycleLength - 19, 'day').format('MMM D'),
          fertileEnd: start.add(cycleLength - 13, 'day').format('MMM D'),
          nextPeriod: nextStart.format('MMM D, YYYY'),
        })
      }
      return history
    }
    const history = generateHistory()
    const avgCycleLength = Math.round(
      history.reduce((sum, h) => sum + h.cycleLength, 0) / history.length
    )
    const avgPeriodLength = Math.round(
      history.reduce((sum, h) => sum + h.periodLength, 0) / history.length
    )


    const conditionOptions = [
        { id: 'none', label: t('condition_none') },
        { id: 'pcos', label: 'PCOS' },
        { id: 'endo', label: 'Endometriosis' },
        { id: 'peri', label: 'Perimenopause' },
        { id: 'other', label: t('condition_other') },
    ]

    const age = profile.dob ? dayjs().diff(dayjs(profile.dob), 'year') : null

    const handleSaveProfile = () => {
        setProfile({ ...draftProfile })
        if (setUserProfile) setUserProfile({ ...draftProfile })
        setIsEditing(false)
    }


    const handleDeleteAllData = async () => {
        setDeleting(true)
        if (resetAllData) {
            await resetAllData()
        }
        setDeleting(false)
        setShowDeleteModal(false)
    }

    const styles = makeStyles(colors)

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.scrollContent}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.avatar, { backgroundColor: colors.pinkLight }]}>
                    <Text style={[styles.avatarText, { color: colors.pinkDark }]}>
                        {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.textPrimary }]}>
                        {profile.name || 'Your name'}
                    </Text>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>
                        {age ? `${age} years old` : ''}
                        {profile.condition !== 'none' &&
                            ` · ${conditionOptions.find(c => c.id === profile.condition)?.label}`}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.editBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
                    onPress={() => {
                        setIsEditing(!isEditing)
                        setDraftProfile({ ...profile })
                    }}
                >
                    <Text style={{ fontSize: 16 }}>{isEditing ? '✕' : '✏️'}</Text>
                </TouchableOpacity>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                {[
                    { value: cycleLength, label: t('cycle') },
                    { value: periodLength, label: t('period') },
                    { value: daysUntilNext, label: t('days_left') },
                ].map((stat, i) => (
                    <View key={i} style={[styles.statBox, { backgroundColor: colors.white, borderColor: colors.border }]}>
                        <Text style={[styles.statValue, { color: colors.pink }]}>{stat.value}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            {/* Tabs */}
            <View style={[styles.tabsRow, { backgroundColor: colors.white, borderColor: colors.border }]}>
                {[
                    { id: 'profile', label: '👤 ' + t('profile') },
                    { id: 'history', label: '📋 ' + t('history_tab') },
                    { id: 'settings', label: '⚙️ ' + t('settings') },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && { backgroundColor: colors.pinkLight }]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === tab.id ? colors.pinkDark : colors.textSecondary }
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
                isEditing ? (
                    <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('edit_profile')}</Text>

                        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('full_name')}</Text>
                        <TextInput
                            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                            value={draftProfile.name}
                            onChangeText={t => setDraftProfile(p => ({ ...p, name: t }))}
                            placeholder="Your name"
                            placeholderTextColor={colors.textSecondary}
                        />

                        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('email')}</Text>
                        <TextInput
                            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                            value={draftProfile.email}
                            onChangeText={t => setDraftProfile(p => ({ ...p, email: t }))}
                            placeholder="your@email.com"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="email-address"
                        />

                        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('health_condition')}</Text>
                        <View style={styles.conditionGrid}>
                            {conditionOptions.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[
                                        styles.conditionBtn,
                                        {
                                            borderColor: draftProfile.condition === c.id ? colors.pink : colors.border,
                                            backgroundColor: draftProfile.condition === c.id ? colors.pinkLight : colors.background,
                                        },
                                    ]}
                                    onPress={() => setDraftProfile(p => ({ ...p, condition: c.id }))}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        color: draftProfile.condition === c.id ? colors.pinkDark : colors.textPrimary,
                                    }}>
                                        {c.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: colors.pink }]}
                            onPress={handleSaveProfile}
                        >
                            <Text style={styles.saveBtnText}>{t('save_profile')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>👤 {t('personal_info')}</Text>
                        {[
                            { label: t('name'), value: profile.name || '—' },
                            { label: t('age'), value: age ? `${age} ${t('years')}` : '—' },
                            { label: t('email'), value: profile.email || '—' },
                            { label: t('condition'), value: conditionOptions.find(c => c.id === profile.condition)?.label || t('condition_none') },
                        ].map((row, i) => (
                            <View key={i} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{row.value}</Text>
                            </View>
                        ))}
                    </View>
                )
            )}


            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <View style={{ gap: 12 }}>
                <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    📊 {t('your_averages')}
                  </Text>
                  <View style={styles.avgGrid}>
                    {[
                      { icon: '🔄', value: `${avgCycleLength} days`, label: t('avg_cycle') },
                      { icon: '🩸', value: `${avgPeriodLength} days`, label: t('avg_period') },
                      { icon: '✨', value: `Day ${cycleLength - 14}`, label: t('avg_ovulation') },
                      { icon: '🌱', value: '7 days', label: t('fertile_window_avg') },
                    ].map((item, i) => (
                      <View key={i} style={[styles.avgItem, { backgroundColor: colors.background }]}>
                        <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                        <Text style={[styles.avgValue, { color: colors.pink }]}>{item.value}</Text>
                        <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Text style={[styles.historyListTitle, { color: colors.textPrimary }]}>
                  📅 {t('last_cycles')} {history.length}
                </Text>

                {[...history].reverse().map((h, i) => (
                  <View key={i} style={[styles.historyCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
                    <View style={[styles.historyCardHeader, { backgroundColor: colors.pinkLight }]}>
                      <Text style={[styles.historyCycleNum, { color: colors.pinkDark }]}>
                        Cycle {h.cycleNum}
                      </Text>
                      <Text style={[styles.historyCycleLength, { color: colors.pink }]}>
                        {h.cycleLength} day cycle
                      </Text>
                    </View>
                    <View style={styles.historyCardBody}>
                      <View style={styles.historyDetailRow}>
                        <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>🩸 {t('period')}</Text>
                        <Text style={[styles.historyValue, { color: colors.textPrimary }]}>
                          {h.periodStart} – {h.periodEnd}
                        </Text>
                      </View>
                      <View style={styles.historyDetailRow}>
                        <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>✨ {t('ovulation')}</Text>
                        <Text style={[styles.historyValue, { color: colors.textPrimary }]}>{h.ovulation}</Text>
                      </View>
                      <View style={styles.historyDetailRow}>
                        <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>🌱 {t('fertile_window')}</Text>
                        <Text style={[styles.historyValue, { color: colors.textPrimary }]}>
                          {h.fertileStart} – {h.fertileEnd}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <View style={{ gap: 12 }}>

                    {/* Premium Status */}
                    <View style={[styles.card, {
                        backgroundColor: isPremium ? colors.pinkLight : colors.white,
                        borderColor: isPremium ? colors.pink : colors.border,
                    }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 28 }}>{isPremium ? '👑' : '⭐'}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                                    {isPremium ? 'Premium Active' : 'Free Plan'}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                    {isPremium && subscription
                                        ? `${subscription.plan} plan · expires ${dayjs(subscription.expiresAt).format('MMM D, YYYY')}`
                                        : 'Upgrade to unlock premium features'}
                                </Text>
                            </View>
                        </View>
                        {isPremium && (
                            <TouchableOpacity
                                style={{ marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#EF4444', alignItems: 'center' }}
                                onPress={cancelPremium}
                            >
                                <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13 }}>Cancel Premium</Text>
                            </TouchableOpacity>
                        )}
                    </View>


                    {/* Language */}
                    <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>🌍 {t('language')}</Text>
                        <View style={styles.rowBtns}>
                            
                            <TouchableOpacity
                                style={[styles.choiceBtn, {
                                    borderColor: language === 'en' ? colors.pink : colors.border,
                                    backgroundColor: language === 'en' ? colors.pinkLight : colors.background,
                                }]}
                                onPress={() => changeLanguage('en')}
                            >
                                <Text style={{
                                    color: language === 'en' ? colors.pinkDark : colors.textPrimary,
                                    fontWeight: language === 'en' ? '700' : '500',
                                }}>
                                    English
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.choiceBtn, {
                                    borderColor: language === 'sw' ? colors.pink : colors.border,
                                    backgroundColor: language === 'sw' ? colors.pinkLight : colors.background,
                                }]}
                                onPress={() => changeLanguage('sw')}
                            >
                                <Text style={{
                                    color: language === 'sw' ? colors.pinkDark : colors.textPrimary,
                                    fontWeight: language === 'sw' ? '700' : '500',
                                }}>
                                    Kiswahili
                                </Text>
                            </TouchableOpacity>

                           
                        </View>
                    </View>

                    {/* Theme */}
                    <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                            {isDark ? '🌙 Dark mode' : '☀️ Light mode'}
                        </Text>
                        <View style={styles.rowBtns}>
                            {['light', 'dark', 'system'].map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.choiceBtnSmall, {
                                        borderColor: theme === t ? colors.pink : colors.border,
                                        backgroundColor: theme === t ? colors.pinkLight : colors.background,
                                    }]}
                                    onPress={() => changeTheme(t)}
                                >
                                    <Text style={{
                                        color: theme === t ? colors.pinkDark : colors.textPrimary,
                                        fontSize: 12,
                                    }}>
                                        {t === 'light' ? '☀️ Light' : t === 'dark' ? '🌙 Dark' : '📱 System'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Navigation links */}
                    <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
                        <TouchableOpacity
                            activeOpacity={0.6}
                            style={[styles.navItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                                navigation.navigate('NotificationSettings')
                            }}
                        >
                            <Text style={{ fontSize: 18 }}>🔔</Text>
                            <Text style={[styles.navItemLabel, { color: colors.textPrimary }]}>{t('notifications_settings')}</Text>
                            <Text style={{ color: colors.textSecondary }}>→</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.6}
                            style={[styles.navItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                                navigation.navigate('Medications')
                            }}
                        >
                            <Text style={{ fontSize: 18 }}>💊</Text>
                            <Text style={[styles.navItemLabel, { color: colors.textPrimary }]}>{t('pills_supplements')}</Text>
                            <Text style={{ color: colors.textSecondary }}>→</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.6}
                            style={[styles.navItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                                navigation.navigate('PartnerInvite')
                            }}
                        >
                            <Text style={{ fontSize: 18 }}>👫</Text>
                            <Text style={[styles.navItemLabel, { color: colors.textPrimary }]}>{t('partner_sharing')}</Text>
                            <Text style={{ color: colors.textSecondary }}>→</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.6}
                            style={[styles.navItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                                navigation.navigate('Articles')
                            }}
                        >
                            <Text style={{ fontSize: 18 }}>📚</Text>
                            <Text style={[styles.navItemLabel, { color: colors.textPrimary }]}>{t('health_articles')}</Text>
                            <Text style={{ color: colors.textSecondary }}>→</Text>
                        </TouchableOpacity>
                    </View>

                <View style={[styles.card, { backgroundColor: colors.white, borderColor: '#EF4444' }]}>
                    <Text style={[styles.cardTitle, { color: '#EF4444' }]}>⚠️ Danger Zone</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
                        This will permanently delete your profile, cycle history, logs, and all saved data. This cannot be undone.
                    </Text>
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => setShowDeleteModal(true)}
                    >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>🗑 Delete all data</Text>
                    </TouchableOpacity>
                </View>


                </View>
            )}


            <Modal visible={showDeleteModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.confirmCard, { backgroundColor: colors.white }]}>
                        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 10 }}>⚠️</Text>
                        <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>
                            Delete all data?
                        </Text>
                        <Text style={[styles.confirmDesc, { color: colors.textSecondary }]}>
                            This will permanently delete your profile, cycle history, and all logs. This cannot be undone.
                        </Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={[styles.confirmCancelBtn, { borderColor: colors.border }]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={handleDeleteAllData}
                                disabled={deleting}
                            >
                                <Text style={{ color: 'white', fontWeight: '700' }}>
                                    {deleting ? 'Deleting...' : 'Yes, delete everything'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </ScrollView>
    )
}

const makeStyles = (colors) => StyleSheet.create({
  deleteBtn: { backgroundColor: '#EF4444', paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  confirmCard: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  confirmTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  confirmDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  confirmDeleteBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: '#EF4444' },
  avgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avgItem: { width: '47%', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  avgValue: { fontSize: 15, fontWeight: '700' },
  avgLabel: { fontSize: 11, textAlign: 'center' },
  historyListTitle: { fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: 4 },
  historyCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  historyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  historyCycleNum: { fontSize: 13, fontWeight: '700' },
  historyCycleLength: { fontSize: 12, fontWeight: '600' },
  historyCardBody: { padding: 14, gap: 8 },
  historyDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyLabel: { fontSize: 12, minWidth: 80 },
  historyValue: { fontSize: 12, fontWeight: '500' },
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 24, fontWeight: '700' },
    name: { fontSize: 18, fontWeight: '700' },
    sub: { fontSize: 12, marginTop: 2 },
    editBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statBox: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
    },
    statValue: { fontSize: 18, fontWeight: '700' },
    statLabel: { fontSize: 10 },
    tabsRow: {
        flexDirection: 'row',
        borderRadius: 14,
        borderWidth: 1,
        padding: 5,
        gap: 6,
        marginBottom: 16,
    },
    tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
    tabText: { fontSize: 13, fontWeight: '500' },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    detailLabel: { fontSize: 13 },
    detailValue: { fontSize: 13, fontWeight: '500' },
    label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
    input: {
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
    },
    conditionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    conditionBtn: {
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    saveBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    saveBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
    rowBtns: { flexDirection: 'row', gap: 8 },
    choiceBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    choiceBtnSmall: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    navItemLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
})

export default Profile