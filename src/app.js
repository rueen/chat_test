/*
 * @Author: diaochan
 * @Date: 2024-04-01 14:35:35
 * @LastEditors: diaochan
 * @LastEditTime: 2024-04-01 16:10:08
 * @Description: 
 */

import { useLaunch } from '@tarojs/taro'
import './static/iconfont/iconfont.css';
import './app.less'

function App({ children }) {

  useLaunch(() => {
    console.log('App launched.')
  })

  // children 是将要会渲染的页面
  return children
}

export default App
