"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      searchText: "",
      loading: false,
      favoritesList: [],
      hasMore: true,
      page: 1,
      pageSize: 10
    };
  },
  computed: {
    filteredFavorites() {
      if (!this.searchText) {
        return this.favoritesList;
      }
      const searchLower = this.searchText.toLowerCase();
      return this.favoritesList.filter(
        (item) => item.name && item.name.toLowerCase().includes(searchLower)
      );
    }
  },
  onLoad() {
    this.loadFavorites();
  },
  onShow() {
    this.refreshFavorites();
  },
  onPullDownRefresh() {
    this.refreshFavorites();
  },
  methods: {
    // 从云数据库加载收藏数据
    async loadFavorites() {
      if (this.loading || !this.hasMore)
        return;
      this.loading = true;
      try {
        const openid = common_vendor.index.getStorageSync("user_openid");
        if (!openid) {
          common_vendor.index.showToast({
            title: "请先登录",
            icon: "none"
          });
          this.loading = false;
          return;
        }
        const db = common_vendor.nr.database();
        const dbCmd = db.command;
        const favorites = await db.collection("user_favorites").where({
          openid
        }).orderBy("createdAt", "desc").skip((this.page - 1) * this.pageSize).limit(this.pageSize).get();
        common_vendor.index.__f__("log", "at pages/favorites/favorites.vue:125", "获取收藏记录成功，完整数据结构:", JSON.stringify(favorites));
        if (!favorites.result || !favorites.result.data || favorites.result.data.length === 0) {
          common_vendor.index.__f__("warn", "at pages/favorites/favorites.vue:129", "用户没有收藏记录");
          this.favoritesList = [];
          this.hasMore = false;
          this.loading = false;
          return;
        }
        const analysisIds = favorites.result.data.map((item) => item.analysis_id);
        common_vendor.index.__f__("log", "at pages/favorites/favorites.vue:138", "分析ID列表:", analysisIds);
        if (!analysisIds.length) {
          common_vendor.index.__f__("warn", "at pages/favorites/favorites.vue:142", "没有有效的分析记录ID");
          this.favoritesList = [];
          this.hasMore = false;
          this.loading = false;
          return;
        }
        const analyses = await db.collection("ingredient_analyses").where({
          _id: dbCmd.in(analysisIds)
        }).get();
        common_vendor.index.__f__("log", "at pages/favorites/favorites.vue:156", "获取分析记录成功，完整数据结构:", JSON.stringify(analyses));
        const analysisMap = {};
        if (analyses.result && analyses.result.data) {
          analyses.result.data.forEach((item) => {
            analysisMap[item._id] = item;
          });
        } else {
          common_vendor.index.__f__("warn", "at pages/favorites/favorites.vue:166", "没有找到匹配的分析记录");
        }
        const newItems = favorites.result.data.map((favorite) => {
          var _a, _b;
          const analysis = analysisMap[favorite.analysis_id];
          const date = favorite.createdAt ? new Date(favorite.createdAt) : /* @__PURE__ */ new Date();
          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          if (!analysis) {
            common_vendor.index.__f__("warn", "at pages/favorites/favorites.vue:180", `未找到ID为${favorite.analysis_id}的分析记录，使用基础数据`);
            return {
              id: favorite._id,
              analysisId: favorite.analysis_id,
              name: "未知产品",
              score: 0,
              image: "/static/images/placeholder.jpg",
              date: formattedDate,
              analysis: {}
            };
          }
          return {
            id: favorite._id,
            analysisId: favorite.analysis_id,
            name: ((_a = analysis.analysis) == null ? void 0 : _a.scoreTitle) || "未知产品",
            score: ((_b = analysis.analysis) == null ? void 0 : _b.score) || 0,
            image: analysis.fileID || "/static/images/placeholder.jpg",
            date: formattedDate,
            analysis: analysis.analysis || {}
          };
        });
        common_vendor.index.__f__("log", "at pages/favorites/favorites.vue:205", "处理后的收藏项:", newItems);
        if (this.page === 1) {
          this.favoritesList = newItems;
        } else {
          this.favoritesList = [...this.favoritesList, ...newItems];
        }
        this.hasMore = newItems.length === this.pageSize;
        if (newItems.length > 0) {
          this.page++;
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/favorites/favorites.vue:222", "获取收藏失败:", error);
        common_vendor.index.showToast({
          title: "获取收藏失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
        common_vendor.index.stopPullDownRefresh();
      }
    },
    // 刷新数据
    refreshFavorites() {
      this.page = 1;
      this.hasMore = true;
      this.loadFavorites();
    },
    // 加载更多
    loadMore() {
      this.loadFavorites();
    },
    // 获取评分样式类
    getScoreClass(score) {
      if (score >= 90)
        return "score-high";
      if (score >= 70)
        return "score-medium";
      return "score-low";
    },
    // 跳转到结果页
    goToResult(item) {
      const completeData = {
        analysis: item.analysis,
        imageId: item.image,
        analysisId: item.analysisId,
        isFavorite: true
        // 从收藏页进入，肯定是已收藏状态
      };
      common_vendor.index.setStorageSync("completeAnalysisData", completeData);
      common_vendor.index.navigateTo({
        url: `/pages/result/result?from=favorites`
      });
    },
    goToCamera() {
      common_vendor.index.navigateTo({
        url: "/pages/camera/camera"
      });
    },
    // 清空收藏
    clearFavorites() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要清空所有收藏记录吗？",
        success: async (res) => {
          if (res.confirm) {
            try {
              this.loading = true;
              const openid = common_vendor.index.getStorageSync("user_openid");
              if (!openid) {
                common_vendor.index.showToast({
                  title: "请先登录",
                  icon: "none"
                });
                this.loading = false;
                return;
              }
              const result = await common_vendor.nr.callFunction({
                name: "toggleFavorite",
                data: {
                  action: "clearAll",
                  openid
                }
              });
              if (result.result && result.result.code === 0) {
                this.favoritesList = [];
                common_vendor.index.showToast({
                  title: "已清空收藏",
                  icon: "success"
                });
              } else {
                common_vendor.index.showToast({
                  title: "操作失败",
                  icon: "none"
                });
              }
            } catch (error) {
              common_vendor.index.__f__("error", "at pages/favorites/favorites.vue:321", "清空收藏失败:", error);
              common_vendor.index.showToast({
                title: "清空收藏失败",
                icon: "none"
              });
            } finally {
              this.loading = false;
            }
          }
        }
      });
    },
    handleSearch(e) {
      this.searchText = e.detail.value;
    },
    // 设置默认图片
    setDefaultImage(item) {
      item.image = "/static/images/placeholder.jpg";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.clearFavorites && $options.clearFavorites(...args)),
    b: common_vendor.o([($event) => $data.searchText = $event.detail.value, (...args) => $options.handleSearch && $options.handleSearch(...args)]),
    c: $data.searchText,
    d: $data.loading
  }, $data.loading ? {} : {}, {
    e: !$data.loading && $data.favoritesList.length > 0
  }, !$data.loading && $data.favoritesList.length > 0 ? {
    f: common_vendor.f($options.filteredFavorites, (item, index, i0) => {
      return {
        a: item.image,
        b: common_vendor.o(($event) => $options.setDefaultImage(item), index),
        c: common_vendor.t(item.name),
        d: common_vendor.t(item.date),
        e: common_vendor.n($options.getScoreClass(item.score)),
        f: index,
        g: common_vendor.o(($event) => $options.goToResult(item), index)
      };
    }),
    g: common_assets._imports_0$1
  } : {}, {
    h: !$data.loading && $data.favoritesList.length === 0
  }, !$data.loading && $data.favoritesList.length === 0 ? {
    i: common_assets._imports_1$1,
    j: common_vendor.o((...args) => $options.goToCamera && $options.goToCamera(...args))
  } : {}, {
    k: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/favorites/favorites.js.map
