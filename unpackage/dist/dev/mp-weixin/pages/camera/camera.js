"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      devicePosition: "back",
      previewImage: ""
    };
  },
  methods: {
    handleError(e) {
      common_vendor.index.showToast({
        title: "相机启动失败",
        icon: "none"
      });
      common_vendor.index.__f__("error", "at pages/camera/camera.vue:65", "相机错误：", e);
    },
    switchCamera() {
      this.devicePosition = this.devicePosition === "back" ? "front" : "back";
    },
    takePhoto() {
      const ctx = common_vendor.index.createCameraContext();
      ctx.takePhoto({
        quality: "high",
        success: (res) => {
          this.previewImage = res.tempImagePath;
        },
        fail: (err) => {
          common_vendor.index.showToast({
            title: "拍照失败",
            icon: "none"
          });
          common_vendor.index.__f__("error", "at pages/camera/camera.vue:82", "拍照错误：", err);
        }
      });
    },
    chooseImage() {
      common_vendor.index.chooseImage({
        count: 1,
        success: (res) => {
          this.previewImage = res.tempFilePaths[0];
        }
      });
    },
    retakePhoto() {
      this.previewImage = "";
    },
    confirmPhoto() {
      common_vendor.index.showLoading({
        title: "正在处理..."
      });
      const openid = common_vendor.index.getStorageSync("user_openid");
      if (!openid) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "用户身份验证失败",
          icon: "none"
        });
        return;
      }
      common_vendor.index.compressImage({
        src: this.previewImage,
        quality: 60,
        // 降低质量以减少文件大小
        compressedWidth: 800,
        // 限制宽度，降低分辨率
        success: (res) => {
          const now = /* @__PURE__ */ new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const timestamp = now.getTime();
          const random = Math.floor(Math.random() * 1e3);
          const cloudPath = `user_images/${openid}/${year}/${month}/${timestamp}_${random}.jpg`;
          let fileID = null;
          common_vendor.index.showLoading({
            title: "上传图片中..."
          });
          common_vendor.nr.uploadFile({
            filePath: res.tempFilePath,
            cloudPath,
            success: (uploadRes) => {
              fileID = uploadRes.fileID;
              common_vendor.index.showLoading({
                title: "正在分析..."
              });
              common_vendor.nr.callFunction({
                name: "imgUploadAndAnalyze",
                data: {
                  fileID,
                  // 只传递fileID，让云函数直接从云存储获取
                  openid
                  // 传递用户openid
                },
                success: (callRes) => {
                  common_vendor.index.__f__("log", "at pages/camera/camera.vue:157", "分析结果:", callRes.result);
                  if (callRes.result && callRes.result.code === 0) {
                    const completeData = {
                      analysis: callRes.result.data,
                      imageId: fileID,
                      analysisId: callRes.result.analysis_id || "",
                      from: "camera"
                    };
                    common_vendor.index.setStorageSync("completeAnalysisData", completeData);
                  }
                  common_vendor.index.hideLoading();
                  common_vendor.index.navigateTo({
                    url: `/pages/result/result?from=camera`
                  });
                },
                fail: (err) => {
                  common_vendor.index.__f__("error", "at pages/camera/camera.vue:182", "分析配料表失败:", err);
                  common_vendor.index.hideLoading();
                  common_vendor.index.showToast({
                    title: "分析失败，请稍后再试",
                    icon: "none",
                    duration: 2e3
                  });
                  const errorData = {
                    imageId: fileID,
                    error: true,
                    errorMsg: "分析失败，请重试"
                  };
                  common_vendor.index.setStorageSync("completeAnalysisData", errorData);
                  setTimeout(() => {
                    common_vendor.index.navigateTo({
                      url: `/pages/result/result?from=camera&error=true`
                    });
                  }, 2e3);
                }
              });
            },
            fail: (err) => {
              common_vendor.index.__f__("error", "at pages/camera/camera.vue:211", "上传图片失败:", err);
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({
                title: "上传图片失败",
                icon: "none"
              });
            }
          });
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/camera/camera.vue:221", "压缩图片失败:", err);
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "图片处理失败",
            icon: "none"
          });
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.handleError && $options.handleError(...args)),
    b: common_vendor.o((...args) => $options.switchCamera && $options.switchCamera(...args)),
    c: common_vendor.o((...args) => $options.takePhoto && $options.takePhoto(...args)),
    d: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args)),
    e: $data.previewImage
  }, $data.previewImage ? {
    f: $data.previewImage,
    g: common_vendor.o((...args) => $options.retakePhoto && $options.retakePhoto(...args)),
    h: common_vendor.o((...args) => $options.confirmPhoto && $options.confirmPhoto(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/camera/camera.js.map
