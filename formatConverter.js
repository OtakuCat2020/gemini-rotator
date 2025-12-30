/**
 * 格式转换器 - 支持OpenAI和Gemini多版本格式互转
 */

class FormatConverter {
  /**
   * 将OpenAI格式转换为Gemini格式
   * @param {Object} openaiReq - OpenAI格式的请求
   * @param {string} version - Gemini版本: 'v1', 'v2', 'v3'
   * @returns {Object} Gemini格式的请求
   */
  static openaiToGemini(openaiReq, version = 'v1') {
    const geminiReq = {
      contents: this.convertMessages(openaiReq.messages),
      generationConfig: this.convertConfig(openaiReq, version)
    };

    // 添加工具调用（function calling）支持
    if (openaiReq.tools) {
      geminiReq.tools = this.convertTools(openaiReq.tools);
    }

    // 添加系统指令
    const systemMessage = openaiReq.messages.find(m => m.role === 'system');
    if (systemMessage) {
      geminiReq.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    // 根据版本调整配置
    if (version === 'v3') {
      // Gemini 3 特定配置
      geminiReq.generationConfig.response_mime_type = 'text/plain';
      
      // 如果有thinking模型，可能需要特殊配置
      if (openaiReq.model && openaiReq.model.includes('thinking')) {
        geminiReq.generationConfig.temperature = 1.0; // thinking模型建议使用较高温度
      }
    } else if (version === 'v2') {
      // Gemini 2.0 Flash 特定配置
      if (!geminiReq.generationConfig.response_mime_type) {
        geminiReq.generationConfig.response_mime_type = 'text/plain';
      }
    }

    return geminiReq;
  }

  /**
   * 转换消息格式
   * @param {Array} messages - OpenAI消息数组
   * @returns {Array} Gemini内容数组
   */
  static convertMessages(messages) {
    const contents = [];
    
    for (const msg of messages) {
      // 跳过系统消息（单独处理）
      if (msg.role === 'system') continue;
      
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const parts = [];
      
      // 处理文本内容
      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const content of msg.content) {
          if (content.type === 'text') {
            parts.push({ text: content.text });
          } else if (content.type === 'image_url') {
            // 处理图片
            parts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: this.extractBase64FromUrl(content.image_url.url)
              }
            });
          }
        }
      }
      
      // 处理工具调用响应
      if (msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments)
            }
          });
        }
      }
      
      // 处理工具调用结果
      if (msg.role === 'tool' || msg.tool_call_id) {
        parts.push({
          functionResponse: {
            name: msg.name || 'unknown',
            response: {
              result: msg.content
            }
          }
        });
      }
      
      contents.push({ role, parts });
    }
    
    return contents;
  }

  /**
   * 转换配置参数
   * @param {Object} openaiReq - OpenAI请求
   * @param {string} version - Gemini版本
   * @returns {Object} Gemini配置
   */
  static convertConfig(openaiReq, version) {
    const config = {};
    
    // 温度
    if (openaiReq.temperature !== undefined) {
      config.temperature = openaiReq.temperature;
    }
    
    // 最大输出tokens
    if (openaiReq.max_tokens !== undefined) {
      if (version === 'v3') {
        config.max_output_tokens = openaiReq.max_tokens;
      } else {
        config.maxOutputTokens = openaiReq.max_tokens;
      }
    }
    
    // Top P
    if (openaiReq.top_p !== undefined) {
      config.topP = openaiReq.top_p;
    }
    
    // Top K
    if (openaiReq.top_k !== undefined) {
      config.topK = openaiReq.top_k;
    }
    
    // 停止序列
    if (openaiReq.stop) {
      config.stopSequences = Array.isArray(openaiReq.stop) ? openaiReq.stop : [openaiReq.stop];
    }
    
    return config;
  }

  /**
   * 转换工具定义
   * @param {Array} tools - OpenAI工具数组
   * @returns {Object} Gemini工具声明
   */
  static convertTools(tools) {
    const functionDeclarations = [];
    
    for (const tool of tools) {
      if (tool.type === 'function') {
        functionDeclarations.push({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters
        });
      }
    }
    
    return {
      functionDeclarations
    };
  }

  /**
   * 将Gemini响应转换为OpenAI格式
   * @param {Object} geminiRes - Gemini响应
   * @param {string} model - 模型名称
   * @returns {Object} OpenAI格式响应
   */
  static geminiToOpenAI(geminiRes, model) {
    const candidate = geminiRes.candidates?.[0];
    
    if (!candidate) {
      throw new Error('No response from Gemini API');
    }
    
    const message = {
      role: 'assistant',
      content: ''
    };
    
    // 处理内容
    if (candidate.content?.parts) {
      const parts = candidate.content.parts;
      const contentParts = [];
      const toolCalls = [];
      
      for (const part of parts) {
        if (part.text) {
          contentParts.push({ type: 'text', text: part.text });
        } else if (part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'function',
            function: {
              name: part.functionCall.name,
              arguments: JSON.stringify(part.functionCall.args)
            }
          });
        }
      }
      
      if (toolCalls.length > 0) {
        message.content = contentParts.length > 0 ? contentParts : null;
        message.tool_calls = toolCalls;
      } else {
        message.content = contentParts.length === 1 ? contentParts[0].text : contentParts;
      }
    }
    
    // 构建OpenAI响应
    const openaiRes = {
      id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: message,
        finish_reason: this.mapFinishReason(candidate.finishReason)
      }],
      usage: {
        prompt_tokens: geminiRes.usageMetadata?.promptTokenCount || 0,
        completion_tokens: geminiRes.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: geminiRes.usageMetadata?.totalTokenCount || 0
      }
    };
    
    return openaiRes;
  }

  /**
   * 映射完成原因
   * @param {string} geminiReason - Gemini的完成原因
   * @returns {string} OpenAI的完成原因
   */
  static mapFinishReason(geminiReason) {
    const reasonMap = {
      'FINISH_REASON_UNSPECIFIED': 'stop',
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter',
      'OTHER': 'stop'
    };
    
    return reasonMap[geminiReason] || 'stop';
  }

  /**
   * 从URL提取Base64数据
   * @param {string} url - 图片URL
   * @returns {string} Base64数据
   */
  static extractBase64FromUrl(url) {
    if (url.startsWith('data:')) {
      return url.split(',')[1];
    }
    return url;
  }

  /**
   * 将OpenAI流式响应转换为Gemini格式（简化版）
   * @param {string} chunk - OpenAI流式数据块
   * @returns {Object} Gemini格式数据
   */
  static openaiStreamToGemini(chunk) {
    // 流式处理需要更复杂的实现
    // 这里提供基本框架
    try {
      const data = JSON.parse(chunk);
      return this.openaiToGemini({
        messages: [{ role: 'user', content: data.choices?.[0]?.delta?.content || '' }],
        model: data.model,
        stream: true
      });
    } catch (e) {
      return null;
    }
  }
}

module.exports = FormatConverter;
