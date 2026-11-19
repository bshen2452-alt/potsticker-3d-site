// 線上訂單設定。這個檔案會公開在網站上，切勿放入密碼或金鑰。
// 部署 gas/Code.gs 為網頁應用程式後，把「/exec」結尾的網址貼到 endpoint（步驟見 gas/README.md）。
// endpoint 留空時，結帳維持「示範模式」，不會送出任何資料。
window.JJ_ORDER_CONFIG = Object.freeze({
  endpoint: ''
});
