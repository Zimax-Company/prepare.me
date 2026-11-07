import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // knex lazily requires every SQL driver; keep it (and mysql2) out of the bundle.
  // speech-rule-engine reads its locale files from node_modules at runtime.
  serverExternalPackages: ['knex', 'mysql2', 'speech-rule-engine'],
  // Speech Rule Engine (lib/narration.ts) loads its language files and dependencies at runtime,
  // so file tracing can't see them. Ship them explicitly (English + base locale only).
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/speech-rule-engine/lib/sre.js',
      './node_modules/speech-rule-engine/package.json',
      './node_modules/speech-rule-engine/lib/mathmaps/base.json',
      './node_modules/speech-rule-engine/lib/mathmaps/en.json',
      './node_modules/@xmldom/xmldom/**/*',
      './node_modules/wicked-good-xpath/**/*',
      './node_modules/commander/**/*',
    ],
  },
  poweredByHeader: false,
}

export default nextConfig
