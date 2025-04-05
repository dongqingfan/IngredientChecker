"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      isFavorite: false,
      imageId: "",
      analysisId: "",
      foodInfo: {
        name: "加载中...",
        score: 0,
        scoreTitle: "分析中...",
        scoreDesc: "正在分析食品安全性...",
        nutritionDesc: "正在分析营养信息...",
        suitablePeople: "正在分析适宜人群...",
        alternativeDesc: "正在分析替代建议...",
        ingredients: []
      },
      analysisData: {},
      _checkedFavoriteInLoad: false
    };
  },
  onLoad(options) {
    common_vendor.index.__f__("log", "at pages/result/result.vue:101", "==result==", options);
    const completeData = common_vendor.index.getStorageSync("completeAnalysisData");
    if (completeData) {
      common_vendor.index.__f__("log", "at pages/result/result.vue:107", "从缓存获取到完整数据:", completeData);
      this.imageId = completeData.imageId || "";
      this.analysisId = completeData.analysisId || "";
      if (completeData.isFavorite !== void 0) {
        this.isFavorite = completeData.isFavorite;
      }
      if (completeData.analysis) {
        this.processAnalysisData(completeData.analysis);
      }
      if (completeData.error) {
        common_vendor.index.showToast({
          title: completeData.errorMsg || "分析失败",
          icon: "none",
          duration: 2e3
        });
      }
      common_vendor.index.removeStorageSync("completeAnalysisData");
    } else if (options.imageId) {
      this.imageId = options.imageId;
      if (options.analysisId) {
        this.analysisId = options.analysisId;
      }
      const analysis = common_vendor.index.getStorageSync("ingredientAnalysis");
      if (analysis) {
        this.processAnalysisData(analysis);
        common_vendor.index.removeStorageSync("ingredientAnalysis");
      } else if (this.imageId) {
        this.getAnalysisFromCloud(this.imageId);
      }
    } else {
      common_vendor.index.showToast({
        title: "未找到分析数据",
        icon: "none"
      });
    }
    if (this.analysisId && this.isFavorite === false) {
      this.checkIfFavoriteFromCloud();
      this._checkedFavoriteInLoad = true;
    }
  },
  onShow() {
    if (this.analysisId && !this._checkedFavoriteInLoad) {
      this.checkIfFavoriteFromCloud();
    }
  },
  methods: {
    processAnalysisData(analysis) {
      try {
        if (typeof analysis === "string") {
          try {
            analysis = JSON.parse(analysis);
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/result/result.vue:180", "JSON解析错误:", e);
            const fixedJson = analysis.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"');
            analysis = JSON.parse(fixedJson);
          }
        }
        this.foodInfo.name = analysis.scoreTitle || "未知产品";
        this.foodInfo.score = analysis.score || 0;
        this.foodInfo.scoreTitle = analysis.scoreTitle || "";
        this.foodInfo.scoreDesc = analysis.scoreDesc || "";
        if (analysis.ingredients && Array.isArray(analysis.ingredients)) {
          this.foodInfo.ingredients = analysis.ingredients.map((item) => {
            return {
              name: item.name || "",
              description: item.description || "",
              riskLevel: item.riskLevel || "low",
              category: item.category || "",
              usage: item.usage || "",
              risks: item.risks || ""
            };
          });
        }
        this.foodInfo.nutritionDesc = analysis.nutritionDesc || "";
        this.foodInfo.suitablePeople = analysis.suitablePeople || "";
        let suitableText = this.foodInfo.suitablePeople;
        if (suitableText.includes("适宜人群：")) {
          suitableText = suitableText.replace(/适宜人群：/g, "适宜人群：\n");
        }
        if (suitableText.includes("不适宜人群：")) {
          suitableText = suitableText.replace(/不适宜人群：/g, "\n不适宜人群：\n");
        }
        if (suitableText.includes("。")) {
          suitableText = suitableText.replace(/。(?!$)/g, "。\n");
        }
        this.foodInfo.suitablePeople = suitableText;
        this.analysisData = {
          score: analysis.score,
          scoreTitle: analysis.scoreTitle,
          timestamp: (/* @__PURE__ */ new Date()).getTime(),
          imageId: this.imageId
        };
        this.checkIfFavoriteFromCloud();
        common_vendor.index.__f__("log", "at pages/result/result.vue:242", "分析数据处理完成:", this.foodInfo);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/result/result.vue:244", "处理分析数据失败:", error);
        common_vendor.index.showToast({
          title: "数据处理失败",
          icon: "none"
        });
      }
    },
    getAnalysisFromCloud(fileID) {
      common_vendor.index.showLoading({
        title: "获取分析结果..."
      });
      common_vendor.nr.callFunction({
        name: "imgUploadAndAnalyze",
        data: {
          fileID
        },
        success: (res) => {
          if (res.result && res.result.code === 0) {
            this.processAnalysisData(res.result.data);
            if (res.result.analysis_id) {
              this.analysisId = res.result.analysis_id;
              this.checkIfFavoriteFromCloud();
            }
          } else {
            common_vendor.index.showToast({
              title: "获取分析失败",
              icon: "none"
            });
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/result/result.vue:281", "获取分析失败:", err);
          common_vendor.index.showToast({
            title: "获取分析失败",
            icon: "none"
          });
        },
        complete: () => {
          common_vendor.index.hideLoading();
        }
      });
    },
    goBack() {
      const pages = getCurrentPages();
      const originPage = pages.find((page) => {
        const route = page.route || page.__route__;
        return route && (route.includes("/home/") || route.includes("/favorites/"));
      });
      if (originPage) {
        const delta = pages.length - pages.indexOf(originPage) - 1;
        common_vendor.index.navigateBack({
          delta: delta > 0 ? delta : 1
        });
      } else {
        common_vendor.index.switchTab({
          url: "/pages/home/home"
        });
      }
    },
    toggleFavorite() {
      try {
        if (!this.analysisId) {
          common_vendor.index.__f__("log", "at pages/result/result.vue:319", "分析ID不存在，尝试先保存记录");
          common_vendor.index.showLoading({
            title: "处理中..."
          });
          const openid = common_vendor.index.getStorageSync("user_openid");
          if (!openid) {
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({
              title: "请先登录",
              icon: "none"
            });
            return;
          }
          common_vendor.nr.callFunction({
            name: "imgUploadAndAnalyze",
            data: {
              fileID: this.imageId,
              openid,
              saveOnly: true,
              // 仅保存记录，不重新分析
              analysis: this.foodInfo
              // 传递当前分析数据
            },
            success: (res) => {
              if (res.result && res.result.code === 0 && res.result.analysis_id) {
                this.analysisId = res.result.analysis_id;
                common_vendor.index.__f__("log", "at pages/result/result.vue:349", "成功获取并设置分析ID:", this.analysisId);
                this.doToggleFavorite();
              } else {
                common_vendor.index.hideLoading();
                common_vendor.index.showToast({
                  title: "无法获取分析ID",
                  icon: "none"
                });
              }
            },
            fail: (err) => {
              common_vendor.index.hideLoading();
              common_vendor.index.__f__("error", "at pages/result/result.vue:362", "保存分析记录失败:", err);
              common_vendor.index.showToast({
                title: "操作失败",
                icon: "none"
              });
            }
          });
          return;
        }
        this.doToggleFavorite();
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/result/result.vue:376", "更新收藏失败:", e);
        common_vendor.index.showToast({
          title: "操作失败",
          icon: "none"
        });
      }
    },
    // 执行实际的收藏/取消收藏操作
    doToggleFavorite() {
      common_vendor.index.showLoading({
        title: this.isFavorite ? "取消收藏中..." : "收藏中..."
      });
      const openid = common_vendor.index.getStorageSync("user_openid");
      if (!openid) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "请先登录",
          icon: "none"
        });
        return;
      }
      const favoriteData = {
        openid,
        analysis_id: this.analysisId
      };
      common_vendor.index.__f__("log", "at pages/result/result.vue:408", "收藏数据:", favoriteData);
      common_vendor.nr.callFunction({
        name: "toggleFavorite",
        data: {
          action: this.isFavorite ? "remove" : "add",
          favoriteData
        },
        success: (res) => {
          var _a;
          common_vendor.index.hideLoading();
          if (res.result && res.result.code === 0) {
            this.isFavorite = !this.isFavorite;
            common_vendor.index.showToast({
              title: this.isFavorite ? "已添加到收藏" : "已取消收藏",
              icon: "success"
            });
          } else {
            common_vendor.index.__f__("error", "at pages/result/result.vue:429", "收藏操作失败:", res.result);
            common_vendor.index.showToast({
              title: ((_a = res.result) == null ? void 0 : _a.message) || "操作失败",
              icon: "none"
            });
          }
        },
        fail: (err) => {
          common_vendor.index.hideLoading();
          common_vendor.index.__f__("error", "at pages/result/result.vue:438", "收藏操作失败:", err);
          common_vendor.index.showToast({
            title: "网络错误，请稍后再试",
            icon: "none"
          });
        }
      });
    },
    goToHome() {
      common_vendor.index.switchTab({
        url: "/pages/home/home"
      });
    },
    goToFavorites() {
      common_vendor.index.switchTab({
        url: "/pages/favorites/favorites"
      });
    },
    goToProfile() {
      common_vendor.index.switchTab({
        url: "/pages/profile/profile"
      });
    },
    // 从云端检查当前食品是否已收藏
    checkIfFavoriteFromCloud() {
      const openid = common_vendor.index.getStorageSync("user_openid");
      if (!openid || !this.analysisId) {
        this.isFavorite = false;
        return;
      }
      common_vendor.nr.callFunction({
        name: "toggleFavorite",
        data: {
          action: "check",
          favoriteData: {
            openid,
            analysis_id: this.analysisId
          }
        },
        success: (res) => {
          if (res.result && res.result.code === 0) {
            this.isFavorite = res.result.isFavorite;
          }
        },
        fail: () => {
          this.isFavorite = false;
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    b: common_vendor.t($data.foodInfo.name),
    c: common_vendor.t($data.isFavorite ? "已收藏" : "收藏"),
    d: common_vendor.o((...args) => $options.toggleFavorite && $options.toggleFavorite(...args)),
    e: $data.isFavorite ? 1 : "",
    f: common_assets._imports_0$1,
    g: common_vendor.t($data.foodInfo.scoreTitle),
    h: common_vendor.t($data.foodInfo.scoreDesc),
    i: common_vendor.f($data.foodInfo.ingredients, (item, index, i0) => {
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.t(item.description),
        c: common_vendor.t(item.riskLevel === "high" ? "风险" : item.riskLevel === "medium" ? "谨慎" : "安全"),
        d: common_vendor.n(item.riskLevel),
        e: index
      };
    }),
    j: common_vendor.t($data.foodInfo.nutritionDesc),
    k: common_vendor.t($data.foodInfo.suitablePeople),
    l: common_vendor.t($data.foodInfo.alternativeDesc)
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/result/result.js.map
