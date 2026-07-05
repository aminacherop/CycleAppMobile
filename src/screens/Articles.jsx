import { useState, Fragment } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native'
import { NativeAdCard } from '../ads'
import { useTheme } from '../context/ThemeContext'

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

const Articles = ({ navigation }) => {
  const { colors } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)

  const filtered = articles.filter(a => {
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const styles = makeStyles(colors)

  // ── ARTICLE DETAIL VIEW ──
  if (selectedArticle) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          activeOpacity={0.6}
          style={styles.backBtn}
          onPress={() => setSelectedArticle(null)}
        >
          <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>← Back to articles</Text>
        </TouchableOpacity>

        <View style={[styles.heroCard, { backgroundColor: selectedArticle.color + '15' }]}>
          <Text style={{ fontSize: 40 }}>{selectedArticle.emoji}</Text>
          <Text style={[styles.heroCategory, { color: selectedArticle.color }]}>
            {selectedArticle.category.toUpperCase()}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>{selectedArticle.title}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{selectedArticle.subtitle}</Text>
          <Text style={[styles.heroReadTime, { color: colors.textSecondary }]}>⏱ {selectedArticle.readTime}</Text>
        </View>

        <View style={styles.articleBody}>
          {selectedArticle.content.split('\n\n').map((para, i) => {
            const isHeading = para === para.toUpperCase() && para.length < 60
            return (
              <Text
                key={i}
                style={isHeading
                  ? [styles.paraHeading, { color: selectedArticle.color }]
                  : [styles.para, { color: colors.textSecondary }]}
              >
                {para}
              </Text>
            )
          })}
        </View>

        <View style={[styles.disclaimer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            ⚕️ This article is for educational purposes only. Please consult a
            qualified healthcare provider for medical advice.
          </Text>
        </View>
      </ScrollView>
    )
  }

  // ── ARTICLE LIST VIEW ──
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <TouchableOpacity
        activeOpacity={0.6}
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('health_articles')}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('articles_subtitle')}</Text>

      {/* Search */}
      <TextInput
        style={[styles.search, { borderColor: colors.border, backgroundColor: colors.white, color: colors.textPrimary }]}
        placeholder="🔍 Search articles..."
        placeholderTextColor={colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryPill,
              {
                backgroundColor: selectedCategory === cat ? colors.pink : colors.white,
                borderColor: selectedCategory === cat ? colors.pink : colors.border,
              },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={{ color: selectedCategory === cat ? 'white' : colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Article list */}
      <View style={{ gap: 10, marginTop: 16 }}>
        {filtered.map((article, i) => (
          <Fragment key={article.id}>
            <TouchableOpacity
              style={[styles.articleCard, { backgroundColor: colors.white, borderColor: colors.border }]}
              onPress={() => setSelectedArticle(article)}
            >
              <View style={[styles.articleIcon, { backgroundColor: article.color + '20' }]}>
                <Text style={{ fontSize: 22 }}>{article.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.articleCategory, { color: article.color }]}>{article.category}</Text>
                <Text style={[styles.articleTitle, { color: colors.textPrimary }]}>{article.title}</Text>
                <Text style={[styles.articleSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                  {article.subtitle}
                </Text>
                <Text style={[styles.articleReadTime, { color: colors.textSecondary }]}>⏱ {article.readTime}</Text>
              </View>
            </TouchableOpacity>
            {/* In-feed native ad after the 3rd article (highest-eCPM format) */}
            {i === 2 && <NativeAdCard />}
          </Fragment>
        ))}
      </View>

      {filtered.length === 0 && (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>🔍</Text>
          <Text style={{ color: colors.textSecondary }}>{t('no_articles_found')}</Text>
        </View>
      )}

      <View style={[styles.disclaimer, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 16 }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
          ⚕️ These articles are for educational purposes only and do not
          constitute medical advice.
        </Text>
      </View>

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  backBtn: { paddingVertical: 8, marginBottom: 4 },
  backBtnText: { fontSize: 14 },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 13, marginBottom: 16, marginTop: 2 },
  search: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  categoryScroll: { marginBottom: 4 },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  articleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleCategory: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  articleSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  articleReadTime: {
    fontSize: 11,
  },
  disclaimer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroCategory: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
  heroReadTime: {
    fontSize: 12,
  },
  articleBody: {
    marginBottom: 20,
  },
  paraHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  para: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
})

export default Articles