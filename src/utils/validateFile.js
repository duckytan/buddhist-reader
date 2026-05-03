export function validateFile(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024,
    allowedTypes = ['application/json', 'text/csv'],
    allowedExtensions = ['json', 'csv']
  } = options

  if (!file) {
    return { valid: false, error: '文件不能为空' }
  }

  const ext = file.name.split('.').pop().toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `不支持的文件格式，仅支持 ${allowedExtensions.join(', ')}`
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `文件大小超过限制 (${(maxSize / 1024 / 1024).toFixed(0)}MB)`
    }
  }

  return { valid: true }
}

export function validateImageFile(file, options = {}) {
  const {
    maxSize = 2 * 1024 * 1024,
    allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
  } = options

  if (!file) {
    return { valid: false, error: '文件不能为空' }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的图片格式，仅支持 JPEG、PNG、SVG、WebP`
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `图片大小超过限制 (${(maxSize / 1024 / 1024).toFixed(0)}MB)`
    }
  }

  return { valid: true }
}
