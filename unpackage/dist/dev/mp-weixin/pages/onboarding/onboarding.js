"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      currentIndex: 0,
      onboardingList: [
        {
          image: "/static/images/onboarding1.svg",
          title: "安心食",
          description: "智能识别食品成分，让您吃得放心"
        },
        {
          image: "/static/images/onboarding2.svg",
          title: "快速扫描",
          description: "对准食品包装，一键识别成分"
        },
        {
          image: "/static/images/onboarding3.svg",
          title: "安全评估",
          description: "专业分析成分安全性，给出建议"
        }
      ]
    };
  },
  methods: {
    handleSwiperChange(e) {
      this.currentIndex = e.detail.current;
    },
    goToHome() {
      common_vendor.index.switchTab({
        url: "/pages/home/home"
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.f($data.onboardingList, (item, index, i0) => {
      return {
        a: item.image,
        b: common_vendor.t(item.title),
        c: common_vendor.t(item.description),
        d: index
      };
    }),
    b: common_vendor.o((...args) => $options.handleSwiperChange && $options.handleSwiperChange(...args)),
    c: common_vendor.f($data.onboardingList, (item, index, i0) => {
      return {
        a: index,
        b: $data.currentIndex === index ? 1 : ""
      };
    }),
    d: common_vendor.o((...args) => $options.goToHome && $options.goToHome(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/onboarding/onboarding.js.map
