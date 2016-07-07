'use strict';

let nextPageUrl = null
let notificationId = null
let Q = []
Q.workingCount = 0
Q.finishedCount = 0
Q.execShift = () => {
  const action = Q.shift()
  Q.workingCount++
  action().then(() => {
    Q.workingCount--
    Q.finishedCount++
    Q.execShift()
  }).catch((e) => {
    Q.finishedCount++
    Q.workingCount--
  })
}
Q.start = () => {
  Q.execShift()
}

const notify = (opt) => new Promise((ok) => {
  chrome.notifications.create(opt, ok)
})

const sendPageUrl = ({url, title, imageUrl}) => new Promise((done) => {
  window.fetch(
    'https://amakan.net:3000/imports',
    {
      body: JSON.stringify({
        amazon_product_url: url,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
    }
  ).then((response) => {
    chrome.notifications.update(
      notificationId,
      {
        title,
        iconUrl: imageUrl,
        message: '登録成功(' + (Q.finishedCount + 1) + '/' + (Q.length + Q.finishedCount + 1) + ')',
        priority: 0,
      }
    )
    done()
  })
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  Q.push(() => sendPageUrl(request))
  if (Q.length > 0 && Q.workingCount <= 2) Q.start()
})

chrome.browserAction.onClicked.addListener((tab) => {
  const urlInfo = document.createElement('a')
  urlInfo.href = tab.url
  if (!/amazon\.co\.jp/.test(urlInfo.hostname)) return console.log('🍣')
  if (/\/order-history/.test(urlInfo.pathname)) {
    return notify({type: 'basic', title: '開始', iconUrl: 'images/icon-38.png', message: '登録中...', priority: 1, requireInteraction: true})
      .then((notifyId) => {
        notificationId = notifyId
        chrome.tabs.sendMessage(tab.id, {action: 'scrapingAllHistory'})
      })
  }
  chrome.tabs.create({url: 'https://amakan.net/search?query=' + tab.url})
})
