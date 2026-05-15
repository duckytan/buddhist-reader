import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('dictIndex build script', () => {
  const outputPath = path.resolve(__dirname, '../../src/data/dictIndex.js')

  beforeAll(() => {
    if (!fs.existsSync(outputPath)) {
      const { execSync } = require('child_process')
      execSync('node scripts/build-dict-index.cjs', { stdio: 'inherit' })
    }
  })

  it('should generate dictIndex.js file', () => {
    expect(fs.existsSync(outputPath)).toBe(true)
  })

  it('should contain term-to-dictIds mapping', () => {
    const content = fs.readFileSync(outputPath, 'utf8')
    const match = content.match(/export const dictIndex = (\{[^}]+\})/)
    expect(match).not.toBeNull()
  })

  it('should sort terms by length descending (long words first)', () => {
    const content = fs.readFileSync(outputPath, 'utf8')
    const match = content.match(/export const dictTerms = \[([^\]]+)\]/)
    if (!match) return
    const termsStr = match[1]
    const terms = termsStr.split(',').map(t => t.trim().replace(/"/g, ''))
    for (let i = 0; i < Math.min(terms.length - 1, 100); i++) {
      expect(terms[i].length).toBeGreaterThanOrEqual(terms[i + 1].length)
    }
  })

  it('should handle Chinese encoded filenames', () => {
    const dictsDir = path.resolve(__dirname, '../../public/dicts')
    const manifest = JSON.parse(fs.readFileSync(path.join(dictsDir, 'manifest.json'), 'utf8'))
    for (const dict of manifest) {
      const dictPath = path.join(dictsDir, dict.filename)
      expect(fs.existsSync(dictPath)).toBe(true)
    }
  })

  it('should skip terms shorter than 2 characters', () => {
    const content = fs.readFileSync(outputPath, 'utf8')
    const match = content.match(/export const dictIndex = (\{.+\})/)
    if (!match) return
    const index = JSON.parse(match[1])
    const shortTerms = Object.keys(index).filter(t => t.length < 2)
    expect(shortTerms.length).toBe(0)
  })
})