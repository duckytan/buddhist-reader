export function isIDBSupported() {
  return typeof indexedDB !== 'undefined'
}

export function handleIDBError(error, operation = '') {
  if (!isIDBSupported()) {
    return {
      code: 'IDB_NOT_SUPPORTED',
      message: '当前浏览器不支持 IndexedDB'
    }
  }

  if (error.name === 'QuotaExceededError') {
    return {
      code: 'IDB_QUOTA_EXCEEDED',
      message: `存储空间不足${operation ? '，' + operation + '失败' : ''}`
    }
  }

  if (error.name === 'InvalidStateError') {
    return {
      code: 'IDB_INVALID_STATE',
      message: '数据库状态异常，请刷新页面重试'
    }
  }

  if (error.name === 'VersionError') {
    return {
      code: 'IDB_VERSION_ERROR',
      message: '数据库版本不兼容，请清除缓存后重试'
    }
  }

  return {
    code: 'IDB_ERROR',
    message: `数据库操作失败${operation ? '：' + operation : ''}`,
    detail: error.message
  }
}

export async function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      usagePercent: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
    }
  }
  return null
}
