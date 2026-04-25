/**
 * TTS（文本转语音）引擎
 * 基于 Web Speech API
 */

export class TTSEngine {
  constructor(options = {}) {
    this.rate = options.rate || 1.0
    this.pitch = options.pitch || 1.0
    this.lang = options.lang || 'zh-CN'
    this.voice = null

    this.synth = window.speechSynthesis
    this.utterance = null
    this.status = 'idle'
    this.onStatusChange = null

    this.voices = []
    this.loadVoices()
  }

  /**
   * 加载可用的语音列表
   */
  loadVoices() {
    const handleVoicesChanged = () => {
      this.voices = this.synth.getVoices()
      this.selectBestVoice()
    }

    // Chrome 需要等待 voiceschanged 事件
    this.synth.onvoiceschanged = handleVoicesChanged
    handleVoicesChanged()
  }

  /**
   * 选择最佳的中文语音
   */
  selectBestVoice() {
    // 优先选择中文语音
    const chineseVoice = this.voices.find(voice =>
      voice.lang.startsWith('zh') && voice.localService
    )

    if (chineseVoice) {
      this.voice = chineseVoice
    } else if (this.voices.length > 0) {
      this.voice = this.voices[0]
    }
  }

  /**
   * 朗读文本
   * @param {String} text - 要朗读的文本
   */
  speak(text) {
    // 停止当前朗读
    this.stop()

    this.utterance = new SpeechSynthesisUtterance(text)
    this.utterance.rate = this.rate
    this.utterance.pitch = this.pitch
    this.utterance.lang = this.lang

    if (this.voice) {
      this.utterance.voice = this.voice
    }

    // 事件监听
    this.utterance.onstart = () => {
      this.status = 'playing'
      this.notifyStatusChange()
    }

    this.utterance.onend = () => {
      this.status = 'idle'
      this.notifyStatusChange()
    }

    this.utterance.onpause = () => {
      this.status = 'paused'
      this.notifyStatusChange()
    }

    this.utterance.onresume = () => {
      this.status = 'playing'
      this.notifyStatusChange()
    }

    this.utterance.onerror = (event) => {
      console.error('TTS Error:', event.error)
      this.status = 'error'
      this.notifyStatusChange()
    }

    this.synth.speak(this.utterance)
  }

  /**
   * 暂停朗读
   */
  pause() {
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause()
    }
  }

  /**
   * 恢复朗读
   */
  resume() {
    if (this.synth.paused) {
      this.synth.resume()
    }
  }

  /**
   * 停止朗读
   */
  stop() {
    this.synth.cancel()
    this.status = 'idle'
    this.notifyStatusChange()
  }

  /**
   * 设置朗读速度
   * @param {Number} rate - 速度倍率 (0.1 - 10)
   */
  setRate(rate) {
    this.rate = Math.max(0.1, Math.min(10, rate))
  }

  /**
   * 设置音调
   * @param {Number} pitch - 音调 (0 - 2)
   */
  setPitch(pitch) {
    this.pitch = Math.max(0, Math.min(2, pitch))
  }

  /**
   * 设置语音
   * @param {Object} voice - SpeechSynthesisVoice 对象
   */
  setVoice(voice) {
    this.voice = voice
  }

  /**
   * 获取当前状态
   * @returns {String} 状态：idle, playing, paused, error
   */
  getStatus() {
    return this.status
  }

  /**
   * 通知状态变化
   */
  notifyStatusChange() {
    if (this.onStatusChange) {
      this.onStatusChange(this.status)
    }
  }
}
