"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      searchText: "",
      historyList: [],
      loading: false
    };
  },
  onLoad() {
    this.loadHistoryData();
  },
  onShow() {
    this.loadHistoryData();
  },
  methods: {
    // 加载历史分析数据
    async loadHistoryData() {
      try {
        this.loading = true;
        const openid = common_vendor.index.getStorageSync("user_openid");
        if (!openid) {
          common_vendor.index.__f__("warn", "at pages/home/home.vue:98", "未找到用户openid，将显示所有记录");
        }
        const db = common_vendor.nr.database();
        const field = {
          fileID: true,
          openid: true,
          createdAt: true,
          "analysis.score": true,
          "analysis.scoreTitle": true,
          "analysis.scoreDesc": true,
          "analysis.nutritionDesc": true,
          "analysis.suitablePeople": true,
          "analysis.alternativeDesc": true,
          "analysis.ingredients": true
          // 不能使用黑名单模式(false)排除字段
        };
        let query;
        if (openid) {
          query = db.collection("ingredient_analyses").where({ openid }).field(field).orderBy("createdAt", "desc");
        } else {
          query = db.collection("ingredient_analyses").field(field).orderBy("createdAt", "desc");
        }
        const result = await query.limit(10).get();
        if (result && result.result && result.result.data && result.result.data.length > 0) {
          common_vendor.index.__f__("log", "at pages/home/home.vue:139", "======第一条数据======", result.result.data[0]);
          this.historyList = result.result.data.map((item) => {
            var _a;
            const date = new Date(item.createdAt);
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
            const productName = ((_a = item.analysis) == null ? void 0 : _a.scoreTitle) || "未知产品";
            return {
              id: item._id,
              fileID: item.fileID,
              name: productName,
              image: item.fileID || "/static/images/placeholder.jpg",
              // 使用fileID作为图片路径
              date: formattedDate,
              isFavorite: false,
              // 默认未收藏，后续可通过收藏表查询更新
              analysis: item.analysis
            };
          });
          common_vendor.index.__f__("log", "at pages/home/home.vue:161", "======转换后的historyList长度======", this.historyList.length);
          this.checkFavoriteStatus();
        } else {
          common_vendor.index.__f__("warn", "at pages/home/home.vue:166", "======没有查询到数据或数据格式不正确======");
          this.historyList = [];
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/home/home.vue:170", "获取历史记录失败:", error);
        common_vendor.index.showToast({
          title: "获取历史记录失败",
          icon: "none"
        });
        this.historyList = [];
      } finally {
        this.loading = false;
      }
    },
    // 检查收藏状态
    checkFavoriteStatus() {
      try {
        const favorites = common_vendor.index.getStorageSync("favorites") || [];
        this.historyList.forEach((item) => {
          const isFavorite = favorites.some(
            (fav) => {
              var _a, _b;
              return fav.imageId === item.fileID || fav.scoreTitle === ((_a = item.analysis) == null ? void 0 : _a.scoreTitle) && ((_b = item.analysis) == null ? void 0 : _b.scoreTitle) !== "";
            }
          );
          item.isFavorite = isFavorite;
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/home/home.vue:195", "检查收藏状态失败:", error);
      }
    },
    goToCamera() {
      common_vendor.index.navigateTo({
        url: "/pages/camera/camera"
      });
    },
    goToResult(item) {
      const completeData = {
        analysis: item.analysis,
        imageId: item.fileID,
        analysisId: item.id,
        // 数据库记录ID
        isFavorite: item.isFavorite
      };
      common_vendor.index.setStorageSync("completeAnalysisData", completeData);
      common_vendor.index.navigateTo({
        url: `/pages/result/result?from=home`
      });
    },
    toggleFavorite(item) {
      var _a, _b;
      try {
        let favorites = common_vendor.index.getStorageSync("favorites") || [];
        const index = favorites.findIndex(
          (fav) => {
            var _a2, _b2;
            return fav.imageId === item.fileID || fav.scoreTitle === ((_a2 = item.analysis) == null ? void 0 : _a2.scoreTitle) && ((_b2 = item.analysis) == null ? void 0 : _b2.scoreTitle) !== "";
          }
        );
        if (index > -1) {
          favorites.splice(index, 1);
          item.isFavorite = false;
          common_vendor.index.showToast({
            title: "已取消收藏",
            icon: "none"
          });
        } else {
          const favoriteItem = {
            imageId: item.fileID,
            scoreTitle: ((_a = item.analysis) == null ? void 0 : _a.scoreTitle) || "",
            score: ((_b = item.analysis) == null ? void 0 : _b.score) || 0,
            timestamp: (/* @__PURE__ */ new Date()).getTime()
          };
          favorites.push(favoriteItem);
          item.isFavorite = true;
          common_vendor.index.showToast({
            title: "已添加到收藏",
            icon: "none"
          });
        }
        common_vendor.index.setStorageSync("favorites", favorites);
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/home/home.vue:261", "更新收藏失败:", e);
        common_vendor.index.showToast({
          title: "操作失败",
          icon: "none"
        });
      }
    },
    async deleteHistory(item) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要删除这条记录吗？",
        success: async (res) => {
          if (res.confirm) {
            try {
              const db = common_vendor.nr.database();
              await db.collection("ingredient_analyses").doc(item.id).remove();
              const index = this.historyList.findIndex((i) => i.id === item.id);
              if (index > -1) {
                this.historyList.splice(index, 1);
              }
              common_vendor.index.showToast({
                title: "删除成功",
                icon: "success"
              });
            } catch (error) {
              common_vendor.index.__f__("error", "at pages/home/home.vue:291", "删除记录失败:", error);
              common_vendor.index.showToast({
                title: "删除失败",
                icon: "none"
              });
            }
          }
        }
      });
    },
    setDefaultImage(item) {
      item.image = "/static/images/placeholder.jpg";
    },
    getScoreClass(score) {
      if (score >= 80) {
        return "high-score";
      } else if (score >= 60) {
        return "medium-score";
      } else {
        return "low-score";
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.searchText,
    b: common_vendor.o(($event) => $data.searchText = $event.detail.value),
    c: $data.loading
  }, $data.loading ? {} : $data.historyList.length === 0 ? {
    e: common_assets._imports_0
  } : {
    f: common_vendor.f($data.historyList, (item, index, i0) => {
      return {
        a: item.image,
        b: common_vendor.o(($event) => $options.setDefaultImage(item), index),
        c: common_vendor.t(item.name || "未知产品"),
        d: common_vendor.t(item.date),
        e: item.isFavorite ? 1 : "",
        f: common_vendor.o(($event) => $options.toggleFavorite(item), index),
        g: common_vendor.o(($event) => $options.deleteHistory(item), index),
        h: index,
        i: common_vendor.o(($event) => $options.goToResult(item), index)
      };
    })
  }, {
    d: $data.historyList.length === 0,
    g: common_assets._imports_1,
    h: common_vendor.o((...args) => $options.goToCamera && $options.goToCamera(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/home/home.js.map
