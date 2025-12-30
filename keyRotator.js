const axios = require('axios');

class KeyRotator {
  constructor(apiKeys) {
    this.apiKeys = apiKeys;
    this.currentIndex = 0;
    this.keyStatus = new Map(); // 记录每个key的失败次数
    
    // 初始化所有key的状态
    for (const key of this.apiKeys) {
      this.keyStatus.set(key, {
        failureCount: 0,
        lastUsed: 0,
        isAvailable: true
      });
    }
    
    this.maxFailures = 3; // 最大失败次数
  }

  /**
   * 获取下一个可用的API Key
   * @returns {Object} { apiKey: string, index: number }
   */
  getNextKey() {
    const availableKeys = this.apiKeys.filter(key => this.keyStatus.get(key).isAvailable);
    
    if (availableKeys.length === 0) {
      throw new Error('所有API Key都已失效');
    }
    
    // 找到当前可用的key
    let attempts = 0;
    const maxAttempts = this.apiKeys.length;
    
    while (attempts < maxAttempts) {
      const key = this.apiKeys[this.currentIndex];
      const status = this.keyStatus.get(key);
      
      if (status.isAvailable) {
        return { apiKey: key, index: this.currentIndex };
      }
      
      // 移动到下一个key
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
      attempts++;
    }
    
    throw new Error('无法找到可用的API Key');
  }

  /**
   * 标记请求成功
   * @param {string} apiKey - API Key
   */
  markSuccess(apiKey) {
    const status = this.keyStatus.get(apiKey);
    if (status) {
      status.failureCount = 0;
      status.lastUsed = Date.now();
      status.isAvailable = true;
      
      // 移动到下一个key
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
      
      console.log(`[KeyRotator] Key ${apiKey.substring(0, 10)}... 请求成功，切换到下一个`);
    }
  }

  /**
   * 标记请求失败
   * @param {string} apiKey - API Key
   * @param {Error} error - 错误信息
   */
  markFailure(apiKey, error) {
    const status = this.keyStatus.get(apiKey);
    if (status) {
      status.failureCount++;
      console.log(`[KeyRotator] Key ${apiKey.substring(0, 10)}... 请求失败 (${status.failureCount}/${this.maxFailures}): ${error.message}`);
      
      // 如果失败次数超过阈值，标记为不可用
      if (status.failureCount >= this.maxFailures) {
        status.isAvailable = false;
        console.log(`[KeyRotator] Key ${apiKey.substring(0, 10)}... 已标记为不可用`);
      }
      
      // 移动到下一个key
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
    }
  }

  /**
   * 发送请求到Gemini API（带重试）
   * @param {string} url - API端点URL
   * @param {Object} data - 请求数据
   * @param {string} model - 模型名称
   * @returns {Promise<Object>} 响应数据
   */
  async sendRequest(url, data, model) {
    let lastError = null;
    const maxRetries = 3;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const { apiKey, index } = this.getNextKey();
        
        console.log(`[KeyRotator] 尝试请求 #${retry + 1}，使用Key #${index}: ${apiKey.substring(0, 10)}...`);
        
        const response = await axios.post(url, data, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60秒超时
        });
        
        // 请求成功
        this.markSuccess(apiKey);
        return response.data;
        
      } catch (error) {
        lastError = error;
        
        // 检查是否是API Key相关错误
        if (this.isApiKeyError(error)) {
          // 提取失败的key（从URL中）
          const urlMatch = url.match(/key=([^&]+)/);
          if (urlMatch) {
            const failedKey = urlMatch[1];
            this.markFailure(failedKey, error);
          }
          
          // 继续尝试下一个key
          continue;
        }
        
        // 如果不是API Key错误，可能是临时错误，直接抛出
        throw error;
      }
    }
    
    // 所有重试都失败
    throw lastError || new Error('请求失败，已尝试所有API Key');
  }

  /**
   * 判断是否是API Key相关错误
   * @param {Error} error - 错误对象
   * @returns {boolean}
   */
  isApiKeyError(error) {
    if (!error.response) {
      return false;
    }
    
    const status = error.response.status;
    const data = error.response.data;
    
    // API Key无效
    if (status === 401 || status === 403) {
      return true;
    }
    
    // 配额超限
    if (status === 429) {
      const errorInfo = data?.error?.message || '';
      if (errorInfo.toLowerCase().includes('quota') || 
          errorInfo.toLowerCase().includes('limit')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 获取所有Key的状态
   * @returns {Array} Key状态数组
   */
  getStatus() {
    return this.apiKeys.map((key, index) => {
      const status = this.keyStatus.get(key);
      return {
        index,
        key: key.substring(0, 10) + '...',
        failureCount: status.failureCount,
        isAvailable: status.isAvailable,
        lastUsed: status.lastUsed ? new Date(status.lastUsed).toISOString() : 'never'
      };
    });
  }

  /**
   * 重置所有Key的状态
   */
  resetAll() {
    console.log('[KeyRotator] 重置所有Key的状态');
    for (const key of this.apiKeys) {
      this.keyStatus.set(key, {
        failureCount: 0,
        lastUsed: 0,
        isAvailable: true
      });
    }
  }

  /**
   * 获取可用Key数量
   * @returns {number}
   */
  getAvailableCount() {
    return Array.from(this.keyStatus.values()).filter(status => status.isAvailable).length;
  }

  /**
   * 获取总Key数量
   * @returns {number}
   */
  getTotalCount() {
    return this.apiKeys.length;
  }
}

module.exports = KeyRotator;
