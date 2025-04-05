"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      historyList: [
        {
          id: 1,
          name: "某品牌薯片",
          image: "/static/images/sample1.jpg",
          time: "10:30",
          score: 85
        },
        {
          id: 2,
          name: "某品牌饮料",
          image: "/static/images/sample2.jpg",
          time: "09:15",
          score: 92
        }
      ]
    };
  },
  computed: {
    groupedHistory() {
      const groups = {};
      this.historyList.forEach((item) => {
        const date = "今天";
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(item);
      });
      return groups;
    }
  },
  methods: {
    getScoreClass(score) {
      if (score >= 90)
        return "score-high";
      if (score >= 70)
        return "score-medium";
      return "score-low";
    },
    goToResult(item) {
      common_vendor.index.navigateTo({
        url: `/pages/result/result?id=${item.id}`
      });
    },
    goToCamera() {
      common_vendor.index.navigateTo({
        url: "/pages/camera/camera"
      });
    },
    clearHistory() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要清空所有历史记录吗？",
        success: (res) => {
          if (res.confirm) {
            this.historyList = [];
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.clearHistory && $options.clearHistory(...args)),
    b: common_vendor.f($options.groupedHistory, (group, date, i0) => {
      return {
        a: common_vendor.t(date),
        b: common_vendor.f(group, (item, index, i1) => {
          return {
            a: item.image,
            b: common_vendor.t(item.name),
            c: common_vendor.t(item.time),
            d: common_vendor.t(item.score),
            e: common_vendor.n($options.getScoreClass(item.score)),
            f: index,
            g: common_vendor.o(($event) => $options.goToResult(item), index)
          };
        }),
        c: date
      };
    }),
    c: $data.historyList.length === 0
  }, $data.historyList.length === 0 ? {
    d: common_assets._imports_0$3,
    e: common_vendor.o((...args) => $options.goToCamera && $options.goToCamera(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/history/history.js.map
