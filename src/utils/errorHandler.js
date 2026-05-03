const ERROR_CODES = {
  NETWORK_ERROR: '网络连接失败',
  DATABASE_ERROR: '数据库操作失败',
  FILE_ERROR: '文件处理失败',
  PERMISSION_ERROR: '权限不足',
  VALIDATION_ERROR: '数据验证失败',
  UNKNOWN_ERROR: '未知错误'
}

export function getUserMessage(errorCode) {
  return ERROR_CODES[errorCode] || ERROR_CODES.UNKNOWN_ERROR
}

export function classifyError(error) {
  if (!error) {
    return { code: 'UNKNOWN_ERROR', message: ERROR_CODES.UNKNOWN_ERROR }
  }

  if (error.name === 'QuotaExceededError') {
    return { code: 'STORAGE_FULL', message: '存储空间已满，请清理缓存' }
  }

  if (error.name === 'NotFoundError') {
    return { code: 'NOT_FOUND', message: '资源不存在' }
  }

  if (error.name === 'AbortError') {
    return { code: 'ABORTED', message: '操作已取消' }
  }

  if (error.code) {
    return {
      code: error.code,
      message: getUserMessage(error.code)
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || ERROR_CODES.UNKNOWN_ERROR
  }
}

export function handleError(error, context = '') {
  const classified = classifyError(error)
  if (context) {
    console.error(`[${context}]`, classified.message, error)
  } else {
    console.error(classified.message, error)
  }
  return classified
}
