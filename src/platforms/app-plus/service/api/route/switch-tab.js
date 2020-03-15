import {
  ANI_CLOSE,
  ANI_DURATION
} from '../../constants'

import {
  showWebview
} from './util'

import {
  setStatusBarStyle,
  invoke
} from '../../bridge'

import {
  registerPage
} from '../../framework/page'

import {
  navigate
} from '../../framework/navigator'

import tabBar from '../../framework/tab-bar'

function _switchTab ({
  url,
  path,
  from
}, callbackId) {
  tabBar.switchTab(path.slice(1))

  const pages = getCurrentPages()
  const len = pages.length

  let callonShow = false

  if (len >= 1) { // 前一个页面是非 tabBar 页面
    const currentPage = pages[len - 1]
    if (!currentPage.$page.meta.isTabBar) {
      // 前一个页面为非 tabBar 页面时，目标tabBar需要强制触发onShow
      // 该情况下目标页tabBarPage的visible是不对的
      // 除非每次路由跳转都处理一遍tabBarPage的visible，目前仅switchTab会处理
      // 简单起见，暂时直接判断该情况，执行onShow
      callonShow = true
      pages.reverse().forEach(page => {
        if (!page.$page.meta.isTabBar && page !== currentPage) {
          page.$remove()
          page.$getAppWebview().close('none')
        }
      })
      currentPage.$remove()
      // 延迟执行避免iOS应用退出
      setTimeout(() => {
        if (currentPage.$page.openType === 'redirect') {
          currentPage.$getAppWebview().close(ANI_CLOSE, ANI_DURATION)
        } else {
          currentPage.$getAppWebview().close('auto')
        }
      }, 100)
    } else {
      // 前一个 tabBar 触发 onHide
      currentPage.$vm.__call_hook('onHide')
    }
  }

  let tabBarPage
  // 查找当前 tabBarPage，且设置 visible
  getCurrentPages(true).forEach(page => {
    if (('/' + page.route) === path) {
      if (!page.$page.meta.visible || callonShow) {
        page.$vm.__call_hook('onShow')
      }
      page.$page.meta.visible = true
      tabBarPage = page
    } else {
      if (page.$page.meta.isTabBar) {
        page.$page.meta.visible = false
      }
    }
  })

  if (tabBarPage) {
    tabBarPage.$getAppWebview().show('none')
  } else {
    return showWebview(registerPage({
      url,
      path,
      query: {},
      openType: 'switchTab'
    }), 'none', 0, () => {
      setStatusBarStyle()
      invoke(callbackId, {
        errMsg: 'switchTab:ok'
      })
    }, 70)
  }

  setStatusBarStyle()
  invoke(callbackId, {
    errMsg: 'switchTab:ok'
  })
}

export function switchTab ({
  url,
  from,
  openType
}, callbackId) {
  const path = url.split('?')[0]
  navigate(path, function () {
    _switchTab({
      url,
      path,
      from
    }, callbackId)
  }, openType === 'appLaunch')
}
