"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/home/home.js";
  "./pages/favorites/favorites.js";
  "./pages/profile/profile.js";
  "./pages/onboarding/onboarding.js";
  "./pages/camera/camera.js";
  "./pages/result/result.js";
  "./pages/history/history.js";
}
const _sfc_main = {
  onLaunch: function() {
    common_vendor.index.__f__("log", "at App.vue:4", "App Launch");
    common_vendor.index.login({
      provider: "weixin",
      success: (loginRes) => {
        common_vendor.index.__f__("log", "at App.vue:9", "======1===");
        common_vendor.index.__f__("log", "at App.vue:10", loginRes.code);
        common_vendor.nr.callFunction({
          name: "getOpenId",
          data: {
            code: loginRes.code
          },
          success: (res) => {
            common_vendor.index.__f__("log", "at App.vue:18", "======2===");
            common_vendor.index.__f__("log", "at App.vue:19", res);
            if (res.result) {
              common_vendor.index.setStorageSync("user_openid", res.result);
              common_vendor.index.__f__("log", "at App.vue:23", "openid已保存：", res.result);
            } else {
              common_vendor.index.__f__("error", "at App.vue:25", "获取openid失败：返回数据格式错误");
            }
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at App.vue:29", "获取openid失败：", err);
          }
        });
      },
      fail: (err) => {
        common_vendor.index.__f__("error", "at App.vue:34", "登录失败：", err);
      }
    });
  },
  onShow: function() {
    common_vendor.index.__f__("log", "at App.vue:39", "App Show");
  },
  onHide: function() {
    common_vendor.index.__f__("log", "at App.vue:42", "App Hide");
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
