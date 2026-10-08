import { useState, useMemo, useCallback, Fragment } from 'react'
import { View, ScrollView, TextInput, StyleSheet, BackHandler } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { NativeAdCard } from '../ads'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import {
  AppText, Card, Chip, EmptyState, Icon, IconBadge, IconButton, Screen, ScreenHeader,
} from '../components/ui'
import { RADIUS } from '../theme/palette'
import { SearchIcon } from './track/parts'

const articles = [
  {
    id: 1,
    category: 'Cycle Health',
    color: '#C2527A',
    emoji: '🩸',
    title: 'Understanding Your Menstrual Cycle',
    subtitle: 'A complete guide to the 4 phases of your cycle',
    readTime: '5 min read',
    content: `Your menstrual cycle is a monthly process your body goes through to prepare for a possible pregnancy.

MENSTRUAL PHASE (Days 1–5)
This is when your period happens. You may feel cramps, fatigue, and lower back pain. This is completely normal.

What helps: Rest, light movement, iron-rich foods like spinach and lentils, a hot water bottle for cramps.

FOLLICULAR PHASE (Days 1–13)
Your body produces estrogen which causes the uterine lining to thicken. You begin to feel more energetic.

What helps: Start new projects, try new workouts, eat fresh vegetables and lean proteins.

OVULATION PHASE (Day 14)
Your body releases an egg. This is your most fertile day. You may notice clear stretchy discharge and feel social and confident.

LUTEAL PHASE (Days 15–28)
Progesterone rises then falls. This is when PMS symptoms appear — bloating, mood changes, cravings.

What helps: Reduce caffeine and salt, eat magnesium-rich foods, prioritise sleep, journal your feelings.

WHEN TO SEE A DOCTOR
See a gynaecologist if periods last longer than 7 days, bleeding is very heavy, cramps disrupt daily life, or cycles are irregular.`,
  },
  {
    id: 2,
    category: 'PCOS',
    color: '#7C3AED',
    emoji: '🔵',
    title: 'PCOS — What Every Woman Should Know',
    subtitle: 'Symptoms, diagnosis, and managing PCOS',
    readTime: '7 min read',
    content: `Polycystic Ovary Syndrome (PCOS) is one of the most common hormonal disorders affecting women. It's estimated to affect roughly 1 in 10 women of reproductive age worldwide.

COMMON SYMPTOMS
Irregular periods, excess hair growth, acne on jawline, weight gain around the abdomen, thinning scalp hair, difficulty getting pregnant.

MANAGING PCOS NATURALLY
Diet: Reduce refined carbs, eat more fibre, eat protein at every meal, avoid processed foods.

Exercise: 30 minutes moderate exercise 5 days a week. Strength training improves insulin sensitivity.

MEDICAL TREATMENTS
Hormonal birth control regulates periods. Metformin improves insulin sensitivity. Clomiphene stimulates ovulation for those trying to conceive.

GETTING HELP
A gynaecologist or endocrinologist can diagnose PCOS through blood tests and an ultrasound. Most public and private hospitals offer PCOS diagnosis and treatment — ask your local health provider or clinic for a referral.`,
  },
  {
    id: 3,
    category: 'Fertility',
    color: '#10B981',
    emoji: '🌱',
    title: 'How to Track Your Fertile Window',
    subtitle: 'Natural methods to identify your most fertile days',
    readTime: '4 min read',
    content: `Understanding your fertile window is essential whether you're trying to conceive or avoid pregnancy naturally.

WHAT IS THE FERTILE WINDOW?
It spans 6 days — the 5 days before ovulation and the day of ovulation itself. Sperm can survive inside the body for up to 5 days.

METHOD 1 — CALENDAR TRACKING
Count your cycle days. For a 28-day cycle, ovulation typically occurs on day 14, with a fertile window of days 9–15.

METHOD 2 — CERVICAL MUCUS
Watch for changes in discharge. Peak fertility is when mucus is clear and stretchy like egg whites.

METHOD 3 — BASAL BODY TEMPERATURE
Take your temperature every morning before getting up. After ovulation it rises by 0.2–0.5°C.

METHOD 4 — OVULATION TEST STRIPS
Detect the LH hormone surge 24–36 hours before ovulation. Widely available at pharmacies and online retailers.`,
  },
  {
    id: 4,
    category: 'Nutrition',
    color: '#F59E0B',
    emoji: '🥗',
    title: 'Eating for Your Cycle — Nutrition Guide',
    subtitle: 'Foods that support each phase of your cycle',
    readTime: '6 min read',
    content: `Your nutritional needs change throughout your cycle. Here's how to eat well during each phase.

MENSTRUAL PHASE — REPLENISH IRON
Leafy greens, beans and lentils, red meat or liver, and iron-fortified cereals all help replace iron lost during your period.

FOLLICULAR PHASE — SUPPORT ESTROGEN
Eggs, fish, avocado, and a mix of legumes and whole grains provide the complete protein and healthy fats your body needs as estrogen rises.

OVULATION PHASE — ANTI-INFLAMMATORY
Oily fish, turmeric, ginger, and fresh vegetables help support your body during peak fertility.

LUTEAL PHASE — REDUCE PMS
Complex carbohydrates like sweet potatoes, bananas, nuts, dark chocolate in moderation, and herbal teas like chamomile and ginger can ease PMS symptoms.

FOODS TO LIMIT
Excess salt, caffeine, alcohol, processed foods, and sugary drinks throughout your cycle.`,
  },
  {
    id: 5,
    category: 'Mental Health',
    color: '#EC4899',
    emoji: '🧠',
    title: 'PMS vs PMDD — Know the Difference',
    subtitle: 'When period mood changes become more serious',
    readTime: '5 min read',
    content: `Most women experience emotional changes before their period. For some, these are severe enough to disrupt daily life — a condition called PMDD.

WHAT IS PMS?
Affects up to 75% of women. Symptoms include mood swings, irritability, bloating, fatigue, and mild anxiety. Uncomfortable but manageable.

WHAT IS PMDD?
A severe form affecting 3-8% of women. Symptoms include intense depression, severe anxiety, extreme mood swings, and difficulty concentrating. PMS is uncomfortable — PMDD is disabling.

MANAGING PMS NATURALLY
Regular exercise, reduce caffeine and alcohol, eat regular meals, sleep 7-9 hours, magnesium and vitamin B6 supplements may help.

WHEN TO SEEK HELP
If symptoms severely affect relationships or work, or you feel hopeless, please reach out to a healthcare provider. PMDD is treatable.`,
  },
  {
    id: 6,
    category: 'Endometriosis',
    color: '#F97316',
    emoji: '🟠',
    title: 'Endometriosis — The Silent Condition',
    subtitle: 'Understanding a condition that affects 1 in 10 women',
    readTime: '6 min read',
    content: `Endometriosis is a condition where tissue similar to the uterine lining grows outside the uterus. It affects roughly 10% of women worldwide.

WHY IT OFTEN GOES UNDIAGNOSED
Average time to diagnosis is 7-10 years. Many women are told their pain is normal. It is not.

COMMON SYMPTOMS
Painful periods worse than typical cramps, pelvic pain throughout the month, painful intercourse, heavy bleeding, fatigue, and sometimes infertility.

DIAGNOSIS
The only definitive diagnosis is through laparoscopy — a minor surgical procedure.

TREATMENT OPTIONS
Pain management with NSAIDs and heat therapy. Hormonal treatments like birth control pills. Laparoscopic surgery for severe cases.

GETTING HELP
A gynaecologist who specializes in endometriosis can help with diagnosis and treatment planning. Ask your primary care provider for a referral, or search for an endometriosis specialist near you.`,
  },
]

const categories = ['All', 'Cycle Health', 'PCOS', 'Fertility', 'Nutrition', 'Mental Health', 'Endometriosis']

// Category → theme tone + line icon (article data above stays unchanged).
const CATEGORY_STYLE = {
  'Cycle Health': { tone: 'period', icon: 'drop' },
  PCOS: { tone: 'ovulation', icon: 'flower' },
  Fertility: { tone: 'fertile', icon: 'leaf' },
  Nutrition: { tone: 'warning', icon: 'sun' },
  'Mental Health': { tone: 'primary', icon: 'smile' },
  Endometriosis: { tone: 'danger', icon: 'shield' },
}
const styleFor = (category) => CATEGORY_STYLE[category] || { tone: 'primary', icon: 'book' }

// UI labels for the (English) category ids and "N min read" strings.
const CATEGORY_KEY = {
  'Cycle Health': 'art_cat_cycle_health',
  PCOS: 'art_cat_pcos',
  Fertility: 'art_cat_fertility',
  Nutrition: 'art_cat_nutrition',
  'Mental Health': 'art_cat_mental_health',
  Endometriosis: 'art_cat_endometriosis',
}
const categoryLabel = (t, category) => (CATEGORY_KEY[category] ? t(CATEGORY_KEY[category]) : String(category || ''))
const readTimeLabel = (t, readTime) => {
  const n = parseInt(String(readTime || ''), 10)
  return Number.isFinite(n) ? t('art_read_time', { n }) : String(readTime || '')
}

const Disclaimer = ({ text }) => {
  const { colors } = useTheme()
  return (
    <View style={[styles.disclaimer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Icon name="info" size={16} color={colors.textMuted} />
      <AppText variant="small" muted style={{ flex: 1, fontWeight: '500', lineHeight: 17 }}>{text}</AppText>
    </View>
  )
}

const ArticleCard = ({ article, onPress }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const { tone, icon } = styleFor(article.category)
  return (
    <Card onPress={onPress} accessibilityLabel={article.title} style={styles.articleCard}>
      <IconBadge name={icon} tone={tone} size={46} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="overline" color={colors[tone]}>{categoryLabel(t, article.category)}</AppText>
        <AppText variant="subheading" style={{ marginTop: 2 }}>{article.title}</AppText>
        <AppText variant="caption" muted numberOfLines={2} style={{ marginTop: 2 }}>{article.subtitle}</AppText>
        <View style={styles.readTime}>
          <Icon name="clock" size={13} color={colors.textFaint} />
          <AppText variant="small" faint>{readTimeLabel(t, article.readTime)}</AppText>
        </View>
      </View>
      <Icon name="chevron-right" size={18} color={colors.textFaint} />
    </Card>
  )
}

const Articles = ({ navigation }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)

  const filtered = useMemo(() => articles.filter(a => {
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  }), [selectedCategory, searchQuery])

  // Android back closes an open article first.
  useFocusEffect(useCallback(() => {
    if (!selectedArticle) return undefined
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setSelectedArticle(null); return true })
    return () => sub.remove()
  }, [selectedArticle]))

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack()
  }

  // ── ARTICLE DETAIL VIEW ──
  if (selectedArticle) {
    const { tone, icon } = styleFor(selectedArticle.category)
    const accent = colors[tone] || colors.primary
    return (
      <Screen
        key={`article-${selectedArticle.id}`}
        header={<ScreenHeader title={categoryLabel(t, selectedArticle.category)} onBack={() => setSelectedArticle(null)} />}
      >
        <View style={[styles.hero, { backgroundColor: colors[`${tone}Soft`] || colors.primarySoft }]}>
          <IconBadge name={icon} tone={tone} size={56} />
          <AppText variant="title" center style={{ marginTop: 12 }}>{selectedArticle.title}</AppText>
          <AppText variant="caption" muted center style={{ marginTop: 6 }}>{selectedArticle.subtitle}</AppText>
          <View style={[styles.readTime, { marginTop: 10 }]}>
            <Icon name="clock" size={13} color={colors.textMuted} />
            <AppText variant="small" muted>{readTimeLabel(t, selectedArticle.readTime)}</AppText>
          </View>
        </View>

        <View style={{ marginBottom: 20 }}>
          {selectedArticle.content.split('\n\n').map((para, i) => {
            const isHeading = para === para.toUpperCase() && para.length < 60
            return isHeading ? (
              <AppText key={i} variant="overline" color={accent} style={styles.paraHeading}>{para}</AppText>
            ) : (
              <AppText key={i} variant="body" color={colors.textMuted} style={styles.para}>{para}</AppText>
            )
          })}
        </View>

        <Disclaimer text={t('art_disclaimer_article')} />
      </Screen>
    )
  }

  // ── ARTICLE LIST VIEW ──
  return (
    <Screen
      key="list"
      header={(
        <ScreenHeader
          title={t('health_articles')}
          subtitle={t('articles_subtitle')}
          onBack={navigation?.canGoBack?.() ? goBack : undefined}
        />
      )}
    >
      {/* Search */}
      <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <SearchIcon size={18} color={colors.textFaint} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('trk_search_articles')}
          placeholderTextColor={colors.textFaint}
          value={searchQuery}
          onChangeText={setSearchQuery}
          maxFontSizeMultiplier={1.35}
          accessibilityLabel={t('trk_search_articles')}
          returnKeyType="search"
        />
        {searchQuery ? (
          <IconButton name="close" size={32} onPress={() => setSearchQuery('')} accessibilityLabel={t('trk_clear')} />
        ) : null}
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {categories.map(cat => (
          <Chip
            key={cat}
            label={cat === 'All' ? t('all_filter') : categoryLabel(t, cat)}
            selected={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
          />
        ))}
      </ScrollView>

      {/* Article list */}
      <View style={{ gap: 10, marginTop: 14 }}>
        {filtered.map((article, i) => (
          <Fragment key={article.id}>
            <ArticleCard article={article} onPress={() => setSelectedArticle(article)} />
            {/* In-feed native ad after the 3rd article (highest-eCPM format) */}
            {i === 2 && <NativeAdCard />}
          </Fragment>
        ))}
      </View>

      {filtered.length === 0 && (
        <EmptyState icon="book" title={t('no_articles_found')} />
      )}

      <View style={{ marginTop: 16 }}>
        <Disclaimer text={t('art_disclaimer_list')} />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    minHeight: 48,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  categoryScroll: { flexGrow: 0 },
  articleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  readTime: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
  },
  hero: {
    borderRadius: RADIUS.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  paraHeading: { marginTop: 18, marginBottom: 6 },
  para: { lineHeight: 23, marginBottom: 4 },
})

export default Articles
