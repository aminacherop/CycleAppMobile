const { withProjectBuildGradle } = require('@expo/config-plugins')

// Google Play Services Ads (pulled in by react-native-google-mobile-ads) is
// precompiled with a newer Kotlin than Expo SDK 54 / RN 0.81 uses (its
// metadata is 2.3.0, our compiler is 2.1.0), which makes the Kotlin compiler
// reject it:
//   "Module was compiled with an incompatible version of Kotlin ..."
// The dependency is ABI-stable and we only call its Java API, so we tell the
// Kotlin compiler to skip the metadata-version check instead of forcing the
// whole project onto a newer (RN-incompatible) Kotlin. Injected here so it
// survives `expo prebuild` on EAS.
const MARKER = '-Xskip-metadata-version-check'

const SNIPPET = `

// ── injected by plugins/withKotlinMetadataSkip.js ──
allprojects {
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions {
      freeCompilerArgs += ["${MARKER}"]
    }
  }
}
`

module.exports = function withKotlinMetadataSkip(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        'withKotlinMetadataSkip is only supported for Groovy build.gradle files'
      )
    }
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += SNIPPET
    }
    return cfg
  })
}
