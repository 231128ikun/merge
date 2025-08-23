// 核心配置
const CONFIG = {
  TOKEN: 'auto', // 访问令牌
  SUB_NAME: 'CF-Workers-SUB', // 订阅名称
  SUB_UPDATE_TIME: 6, // 订阅更新时间(小时)
  SUB_API: 'sub.cmliussss.net', // 订阅转换API
  SUB_CONFIG: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini', // 订阅配置
  DEFAULT_NODES: `https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray` // 默认节点
};

// 支持的用户代理列表
const USER_AGENTS = {
  v2ray: 'v2rayn/6.45',
  clash: 'clash',
  singbox: 'sing-box',
  surge: 'surge',
  quantumult: 'quantumult',
  loon: 'loon'
};

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const userAgent = request.headers.get('User-Agent') || '';
    
    // 验证访问权限
    if (!await verifyAccess(token, env, url)) {
      return await handleUnauthorizedAccess(request, env, url);
    }
    
    // 处理管理界面请求
    if (request.method === 'GET' && userAgent.includes('Mozilla')) {
      return await handleManagementUI(request, env, url);
    }
    
    // 处理订阅更新请求
    if (request.method === 'POST') {
      return await handleSubscriptionUpdate(request, env);
    }
    
    // 处理订阅获取请求
    return await handleSubscriptionFetch(request, env, userAgent, url);
  }
};

// 验证访问权限
async function verifyAccess(token, env, url) {
  const configToken = env.TOKEN || CONFIG.TOKEN;
  
  // 允许通过token或路径访问
  if (token === configToken || url.pathname === `/${configToken}`) {
    return true;
  }
  
  // 生成每日令牌
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const timeTemp = Math.ceil(currentDate.getTime() / 1000);
  const dailyToken = await generateMD5(`${configToken}${timeTemp}`);
  
  return token === dailyToken;
}

// 处理未授权访问
async function handleUnauthorizedAccess(request, env, url) {
  // 可配置的重定向
  if (env.REDIRECT_URL) {
    return Response.redirect(env.REDIRECT_URL, 302);
  }
  
  // 默认返回Nginx页面
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Welcome to nginx!</title>
      <style>body { width: 35em; margin: 0 auto; font-family: Tahoma, Verdana, Arial, sans-serif; }</style>
    </head>
    <body>
      <h1>Welcome to nginx!</h1>
      <p>If you see this page, the nginx web server is successfully installed and working.</p>
      <p><em>Thank you for using nginx.</em></p>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
  });
}

// 处理订阅获取
async function handleSubscriptionFetch(request, env, userAgent, url) {
  // 获取订阅内容
  let subscriptionData = await getSubscriptionData(env);
  
  // 确定响应格式
  const format = determineResponseFormat(userAgent, url);
  
  // 处理订阅链接
  const subscriptionLinks = extractLinks(subscriptionData);
  let nodeData = extractNodes(subscriptionData);
  
  // 获取远程订阅内容
  if (subscriptionLinks.length > 0) {
    const remoteContent = await fetchRemoteSubscriptions(subscriptionLinks, request);
    nodeData += '\n' + remoteContent;
  }
  
  // 根据格式返回响应
  return formatResponse(nodeData, format, env.SUB_NAME || CONFIG.SUB_NAME);
}

// 获取订阅数据
async function getSubscriptionData(env) {
  // 优先从KV获取
  if (env.KV) {
    const kvData = await env.KV.get('subscriptions');
    if (kvData) return kvData;
  }
  
  // 其次从环境变量获取
  if (env.SUBSCRIPTIONS) {
    return env.SUBSCRIPTIONS;
  }
  
  // 使用默认节点
  return CONFIG.DEFAULT_NODES;
}

// 确定响应格式
function determineResponseFormat(userAgent, url) {
  const ua = userAgent.toLowerCase();
  
  // 检查URL参数
  if (url.searchParams.has('b64') || url.searchParams.has('base64')) return 'base64';
  if (url.searchParams.has('clash')) return 'clash';
  if (url.searchParams.has('singbox') || url.searchParams.has('sb')) return 'singbox';
  if (url.searchParams.has('surge')) return 'surge';
  if (url.searchParams.has('quanx')) return 'quanx';
  if (url.searchParams.has('loon')) return 'loon';
  
  // 根据User-Agent判断
  if (ua.includes('clash') || ua.includes('meta') || ua.includes('mihomo')) return 'clash';
  if (ua.includes('sing-box') || ua.includes('singbox')) return 'singbox';
  if (ua.includes('surge')) return 'surge';
  if (ua.includes('quantumult')) return 'quanx';
  if (ua.includes('loon')) return 'loon';
  
  // 默认返回base64
  return 'base64';
}

// 提取链接
function extractLinks(data) {
  const lines = data.split('\n');
  return lines.filter(line => 
    line.trim() && 
    (line.startsWith('http://') || line.startsWith('https://'))
  );
}

// 提取节点
function extractNodes(data) {
  const lines = data.split('\n');
  return lines.filter(line => 
    line.trim() && 
    !line.startsWith('http://') && 
    !line.startsWith('https://') &&
    !line.startsWith('#') &&
    line.includes('://')
  ).join('\n');
}

// 获取远程订阅
async function fetchRemoteSubscriptions(links, originalRequest) {
  const results = await Promise.allSettled(
    links.map(link => fetchWithAntiBlock(link, originalRequest))
  );
  
  let content = '';
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      content += '\n' + result.value;
    }
  }
  
  return content;
}

// 带反屏蔽功能的获取
async function fetchWithAntiBlock(url, originalRequest) {
  // 尝试多种用户代理和策略
  const strategies = [
    { 
      headers: { 
        'User-Agent': USER_AGENTS.v2ray,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    },
    {
      headers: {
        'User-Agent': USER_AGENTS.clash,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    },
    {
      headers: {
        'User-Agent': USER_AGENTS.singbox,
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    }
  ];
  
  for (const strategy of strategies) {
    try {
      const response = await fetch(url, {
        headers: strategy.headers,
        cf: {
          cacheEverything: false,
          cacheTtl: 300
        }
      });
      
      if (response.ok) {
        let content = await response.text();
        
        // 如果是base64编码的内容，则解码
        if (isValidBase64(content)) {
          content = base64Decode(content);
        }
        
        return content;
      }
    } catch (error) {
      console.log(`Fetch strategy failed: ${error.message}`);
    }
  }
  
  return '';
}

// 格式化响应
async function formatResponse(data, format, filename) {
  // 去重处理
  const uniqueLines = [...new Set(data.split('\n').filter(line => line.trim()))];
  const uniqueData = uniqueLines.join('\n');
  
  // 根据格式处理
  if (format === 'base64') {
    const base64Data = base64Encode(uniqueData);
    return new Response(base64Data, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Profile-Update-Interval': `${CONFIG.SUB_UPDATE_TIME * 3600}`,
        'Content-Disposition': `attachment; filename="${filename}.txt"`
      }
    });
  }
  
  // 其他格式使用订阅转换API
  const subApi = env.SUB_API || CONFIG.SUB_API;
  const subConfig = env.SUB_CONFIG || CONFIG.SUB_CONFIG;
  
  // 构建转换URL
  let targetFormat = 'clash';
  if (format === 'singbox') targetFormat = 'singbox';
  if (format === 'surge') targetFormat = 'surge';
  if (format === 'quanx') targetFormat = 'quanx';
  if (format === 'loon') targetFormat = 'loon';
  
  // 对数据进行base64编码以便传输
  const encodedData = base64Encode(uniqueData);
  const conversionUrl = `https://${subApi}/sub?target=${targetFormat}&url=data:text/plain;base64,${encodedData}&config=${encodeURIComponent(subConfig)}&emoji=true`;
  
  try {
    const response = await fetch(conversionUrl);
    if (response.ok) {
      const content = await response.text();
      return new Response(content, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Profile-Update-Interval': `${CONFIG.SUB_UPDATE_TIME * 3600}`,
          'Content-Disposition': `attachment; filename="${filename}.yaml"`
        }
      });
    }
  } catch (error) {
    console.log('Subscription conversion failed, falling back to base64');
  }
  
  // 转换失败时回退到base64
  const base64Data = base64Encode(uniqueData);
  return new Response(base64Data, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Profile-Update-Interval': `${CONFIG.SUB_UPDATE_TIME * 3600}`,
      'Content-Disposition': `attachment; filename="${filename}.txt"`
    }
  });
}

// 处理管理界面
async function handleManagementUI(request, env, url) {
  const token = env.TOKEN || CONFIG.TOKEN;
  const subscriptions = await getSubscriptionData(env);
  
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${CONFIG.SUB_NAME} 订阅管理</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: #333;
          padding: 20px;
        }
        
        .container {
          max-width: 900px;
          margin: 0 auto;
        }
        
        .card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        h1 {
          text-align: center;
          color: #2c3e50;
          font-size: 2.2rem;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .subtitle {
          text-align: center;
          color: #7f8c8d;
          margin-bottom: 30px;
          font-size: 1rem;
        }
        
        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .info-item h3 {
          color: #2c3e50;
          margin-bottom: 15px;
          font-size: 1.2rem;
          font-weight: 600;
        }
        
        .subscription-url {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          padding: 12px;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 14px;
          word-break: break-all;
          color: #495057;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .subscription-url:hover {
          border-color: #667eea;
          background: #e9ecef;
        }
        
        .copy-btn {
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .copy-btn:hover {
          background: #5a67d8;
        }
        
        .help-text {
          color: #6c757d;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .help-text p {
          margin-bottom: 8px;
        }
        
        textarea {
          width: 100%;
          height: 300px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          padding: 15px;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          background: #f8f9fa;
          color: #495057;
          transition: all 0.2s ease;
          margin-bottom: 20px;
        }
        
        textarea:focus {
          outline: none;
          border-color: #667eea;
          background: white;
        }
        
        .btn {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-right: 10px;
        }
        
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
          background: #6c757d;
        }
        
        .btn-secondary:hover {
          background: #545b62;
          box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
        }
        
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #28a745;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          display: none;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .stats {
          display: flex;
          gap: 20px;
          margin-top: 15px;
        }
        
        .stat {
          text-align: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
          min-width: 80px;
        }
        
        .stat-number {
          font-size: 1.5rem;
          font-weight: 600;
          color: #667eea;
        }
        
        .stat-label {
          font-size: 12px;
          color: #6c757d;
          margin-top: 2px;
        }
        
        @media (max-width: 768px) {
          .info-section {
            grid-template-columns: 1fr;
          }
          
          .container {
            padding: 10px;
          }
          
          .card {
            padding: 20px;
          }
          
          h1 {
            font-size: 1.8rem;
          }
          
          .stats {
            justify-content: center;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <h1>${CONFIG.SUB_NAME}</h1>
          <p class="subtitle">订阅管理面板</p>
          
          <div class="info-section">
            <div class="info-item">
              <h3>订阅地址</h3>
              <div class="subscription-url" onclick="copyToClipboard('https://${url.hostname}/${token}')">
                https://${url.hostname}/${token}
              </div>
              <button class="copy-btn" onclick="copyToClipboard('https://${url.hostname}/${token}')">
                复制链接
              </button>
              <div class="stats">
                <div class="stat">
                  <div class="stat-number" id="nodeCount">${subscriptions.split('\n').filter(line => line.trim()).length}</div>
                  <div class="stat-label">总行数</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${CONFIG.SUB_UPDATE_TIME}h</div>
                  <div class="stat-label">更新间隔</div>
                </div>
              </div>
            </div>
            
            <div class="info-item">
              <h3>使用说明</h3>
              <div class="help-text">
                <p>• 每行一个节点链接或订阅地址</p>
                <p>• 支持 vmess、ss、trojan 等协议</p>
                <p>• 支持订阅链接自动获取节点</p>
                <p>• 自动转换为不同客户端格式</p>
                <p>• 客户端通过 User-Agent 自动识别</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card">
          <h3 style="margin-bottom: 20px; color: #2c3e50;">节点配置</h3>
          <form method="POST">
            <textarea 
              name="subscriptions" 
              placeholder="请输入节点链接或订阅链接，每行一个..."
              oninput="updateStats(this)"
            >${subscriptions}</textarea>
            <button type="submit" class="btn">保存配置</button>
            <button type="button" class="btn btn-secondary" onclick="clearContent()">清空内容</button>
          </form>
        </div>
      </div>
      
      <div class="toast" id="toast"></div>
      
      <script>
        function copyToClipboard(text) {
          navigator.clipboard.writeText(text).then(() => {
            showToast('订阅地址已复制到剪贴板');
          }).catch(() => {
            showToast('复制失败，请手动复制');
          });
        }
        
        function showToast(message) {
          const toast = document.getElementById('toast');
          toast.textContent = message;
          toast.style.display = 'block';
          setTimeout(() => {
            toast.style.display = 'none';
          }, 2000);
        }
        
        function updateStats(textarea) {
          const lines = textarea.value.split('\\n').filter(line => line.trim());
          document.getElementById('nodeCount').textContent = lines.length;
        }
        
        function clearContent() {
          if (confirm('确定要清空所有内容吗？')) {
            document.querySelector('textarea').value = '';
            updateStats(document.querySelector('textarea'));
          }
        }
      </script>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// 处理订阅更新
async function handleSubscriptionUpdate(request, env) {
  try {
    const formData = await request.formData();
    const subscriptions = formData.get('subscriptions');
    
    if (env.KV) {
      await env.KV.put('subscriptions', subscriptions);
    }
    
    return new Response('保存成功', {
      status: 303,
      headers: { 'Location': request.url }
    });
  } catch (error) {
    return new Response('保存失败: ' + error.message, { status: 500 });
  }
}

// 工具函数: Base64编码
function base64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// 工具函数: Base64解码
function base64Decode(str) {
  return decodeURIComponent(escape(atob(str)));
}

// 工具函数: 验证Base64
function isValidBase64(str) {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
}

// 工具函数: 生成MD5哈希
async function generateMD5(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('MD5', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
