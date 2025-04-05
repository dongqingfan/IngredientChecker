"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      userInfo: null,
      hasUserInfo: false,
      canIUseGetUserProfile: false,
      menuList: [
        {
          icon: "icon-settings",
          text: "设置",
          url: "/pages/settings/settings"
        },
        {
          icon: "icon-about",
          text: "关于我们",
          url: "/pages/about/about"
        },
        {
          icon: "icon-help",
          text: "帮助与反馈",
          url: "/pages/help/help"
        }
      ]
    };
  },
  onLoad() {
    if (common_vendor.index.getUserProfile) {
      this.canIUseGetUserProfile = true;
    }
  },
  methods: {
    getUserProfile() {
      common_vendor.index.getUserProfile({
        desc: "用于完善会员资料",
        success: (res) => {
          this.userInfo = res.userInfo;
          this.hasUserInfo = true;
        }
      });
    },
    navigateTo(url) {
      common_vendor.index.navigateTo({
        url
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.hasUserInfo
  }, !$data.hasUserInfo ? {
    b: common_assets._imports_0$2,
    c: common_vendor.o((...args) => $options.getUserProfile && $options.getUserProfile(...args))
  } : {
    d: $data.userInfo.avatarUrl,
    e: common_vendor.t($data.userInfo.nickName)
  }, {
    f: common_vendor.f($data.menuList, (item, index, i0) => {
      return {
        a: common_vendor.n(item.icon),
        b: common_vendor.t(item.text),
        c: index,
        d: common_vendor.o(($event) => $options.navigateTo(item.url), index)
      };
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/profile/profile.js.map
