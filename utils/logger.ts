const isDev = process.env.NODE_ENV === 'development'

export const log = {
  page: (pageName: string, info?: any) => {
    if (!isDev) return
    console.log(`%c[PAGE] ${pageName}`, 'color: #00bcd4; font-weight: bold', info || '')
  },
  action: (action: string, data?: any) => {
    if (!isDev) return
    console.log(`%c[ACTION] ${action}`, 'color: #4caf50; font-weight: bold', data || '')
  },
  api: (endpoint: string, payload?: any) => {
    if (!isDev) return
    console.log(`%c[API →] ${endpoint}`, 'color: #ff9800; font-weight: bold', payload || '')
  },
  apiResponse: (endpoint: string, response?: any) => {
    if (!isDev) return
    console.log(`%c[API ←] ${endpoint}`, 'color: #8bc34a; font-weight: bold', response || '')
  },
  apiError: (endpoint: string, error?: any) => {
    console.error(`%c[API ERROR] ${endpoint}`, 'color: #f44336; font-weight: bold', error || '')
  },
  state: (key: string, value: any) => {
    if (!isDev) return
    console.log(`%c[STATE] ${key}`, 'color: #9c27b0; font-weight: bold', value)
  },
  ffmpeg: (msg: string, data?: any) => {
    if (!isDev) return
    console.log(`%c[FFMPEG] ${msg}`, 'color: #ff5722; font-weight: bold', data || '')
  },
  error: (context: string, error?: any) => {
    console.error(`%c[ERROR] ${context}`, 'color: #f44336; font-weight: bold; font-size: 14px', error || '')
  }
}
