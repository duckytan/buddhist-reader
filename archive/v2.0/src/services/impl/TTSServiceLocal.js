import { ok, fail } from '../interfaces/serviceResult.js'

export class TTSServiceLocal {
  constructor() {
    this.synth = window.speechSynthesis
    this.currentUtterance = null
    this.isSpeaking = false
    this.isPaused = false
    this.rate = 1.0
  }

  async init() {
    try {
      if (!this.synth) {
        return fail('TTS_NOT_SUPPORTED', '当前浏览器不支持语音合成')
      }
      return ok(null)
    } catch (error) {
      return fail('TTS_INIT_ERROR', '语音引擎初始化失败', error.message)
    }
  }

  async speak(text, options = {}) {
    try {
      if (!this.synth) {
        return fail('TTS_NOT_SUPPORTED', '当前浏览器不支持语音合成')
      }

      this.stop()

      this.currentUtterance = new SpeechSynthesisUtterance(text)
      this.currentUtterance.rate = options.rate || this.rate
      this.currentUtterance.pitch = options.pitch || 1.0
      this.currentUtterance.lang = options.lang || 'zh-CN'

      if (options.voice) {
        this.currentUtterance.voice = options.voice
      }

      this.currentUtterance.onstart = () => {
        this.isSpeaking = true
        this.isPaused = false
      }

      this.currentUtterance.onend = () => {
        this.isSpeaking = false
        this.isPaused = false
      }

      this.currentUtterance.onerror = (event) => {
        this.isSpeaking = false
        this.isPaused = false
        console.error('[TTS] Speech error:', event.error)
      }

      this.synth.speak(this.currentUtterance)
      return ok(null)
    } catch (error) {
      return fail('TTS_SPEAK_ERROR', '语音播放失败', error.message)
    }
  }

  async stop() {
    try {
      if (this.synth) {
        this.synth.cancel()
        this.isSpeaking = false
        this.isPaused = false
      }
      return ok(null)
    } catch (error) {
      return fail('TTS_STOP_ERROR', '停止语音失败', error.message)
    }
  }

  async pause() {
    try {
      if (this.synth && this.isSpeaking && !this.isPaused) {
        this.synth.pause()
        this.isPaused = true
      }
      return ok(null)
    } catch (error) {
      return fail('TTS_PAUSE_ERROR', '暂停语音失败', error.message)
    }
  }

  async resume() {
    try {
      if (this.synth && this.isPaused) {
        this.synth.resume()
        this.isPaused = false
      }
      return ok(null)
    } catch (error) {
      return fail('TTS_RESUME_ERROR', '恢复语音失败', error.message)
    }
  }

  async getVoices(lang = 'zh') {
    try {
      if (!this.synth) {
        return ok([])
      }

      let voices = this.synth.getVoices()
      if (voices.length === 0) {
        voices = await new Promise(resolve => {
          this.synth.onvoiceschanged = () => {
            resolve(this.synth.getVoices())
          }
          setTimeout(() => resolve([]), 1000)
        })
      }

      if (lang) {
        voices = voices.filter(v => v.lang.startsWith(lang))
      }

      return ok(voices)
    } catch (error) {
      return fail('TTS_VOICES_ERROR', '获取语音列表失败', error.message)
    }
  }

  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.0, rate))
  }
}
