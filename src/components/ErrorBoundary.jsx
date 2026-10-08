import { Component } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'

// Catches render errors so one broken screen shows a friendly "Try again"
// card instead of crashing the whole app. Uses plain RN components and
// fixed colours on purpose: it must work even if the theme/i18n failed.
//
//   <ErrorBoundary scope="Calendar"> … </ErrorBoundary>
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.warn(`[ErrorBoundary:${this.props.scope || 'app'}]`, error?.message, info?.componentStack?.slice(0, 500))
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.error) return this.props.children
    const dark = !!this.props.dark
    return (
      <View style={[styles.wrap, { backgroundColor: dark ? '#120D11' : '#FFF8FA' }]}>
        <View style={[styles.card, { backgroundColor: dark ? '#1C1519' : '#FFFFFF', borderColor: dark ? '#2E242A' : '#F0E3E9' }]}>
          <Text style={[styles.title, { color: dark ? '#F5EFF2' : '#1F1A24' }]}>
            {this.props.title || 'Something went wrong'}
          </Text>
          <Text style={[styles.body, { color: dark ? '#B3A9B0' : '#6B6472' }]}>
            {this.props.message || "Your data is safe. Tap below to try again."}
          </Text>
          <Pressable onPress={this.reset} style={styles.btn} accessibilityRole="button">
            <Text style={styles.btnText}>{this.props.retryLabel || 'Try again'}</Text>
          </Pressable>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 22, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 18, backgroundColor: '#C2527A', borderRadius: 999, paddingHorizontal: 26, paddingVertical: 13 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
})

// Wrap a screen component so a crash inside it stays inside it.
export const withBoundary = (Screen, scope) => {
  const Wrapped = (props) => (
    <ErrorBoundary scope={scope}>
      <Screen {...props} />
    </ErrorBoundary>
  )
  Wrapped.displayName = `Safe(${scope || Screen.displayName || Screen.name || 'Screen'})`
  return Wrapped
}
