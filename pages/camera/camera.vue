<template>
  <view class="container">
    <!-- 相机预览 -->
    <camera 
      class="camera"
      device-position="back"
      flash="auto"
      @error="handleError"
      v-if="!previewImage"
    >
      <!-- 扫描框 -->
      <view class="scan-frame">
        <view class="corner top-left"></view>
        <view class="corner top-right"></view>
        <view class="corner bottom-left"></view>
        <view class="corner bottom-right"></view>
      </view>
      
      <!-- 提示文字 -->
      <view class="tips">
        <text>{{ currentPhotoType === 'product' ? '将商品名称对准框内' : '将配料表对准框内' }}</text>
        <text>保持画面稳定</text>
        <text class="photo-step">{{ currentPhotoType === 'product' ? '第1张：商品名称' : '第2张：配料表信息' }}</text>
      </view>
    </camera>
    
    <!-- 底部操作栏 -->
    <view class="bottom-bar" v-if="!previewImage">
      <view class="action-btn" @tap="switchCamera">
        <text class="iconfont icon-switch-camera"></text>
      </view>
      
      <view class="capture-btn" @tap="takePhoto">
        <view class="inner-circle"></view>
      </view>
      
      <view class="action-btn" @tap="chooseImage">
        <text class="iconfont icon-gallery"></text>
      </view>
    </view>

    <!-- 预览区域 -->
    <view class="preview-area" v-if="previewImage">
      <view class="preview-title">{{ currentPhotoType === 'product' ? '商品名称照片' : '配料表照片' }}</view>
      <image :src="previewImage" mode="aspectFit" class="preview-image"></image>
      <view class="preview-actions">
        <view class="preview-btn retake" @tap="retakePhoto">重拍</view>
        <view class="preview-btn confirm" @tap="confirmPhoto">确认</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      devicePosition: 'back',
      previewImage: '',
      productPhoto: '', // 商品名称照片路径
      ingredientPhoto: '', // 配料表照片路径
      currentPhotoType: 'product', // 当前拍摄的照片类型：'product'或'ingredient'
      uploadedFiles: {
        product: null,
        ingredient: null
      }
    }
  },
  methods: {
    handleError(e) {
      uni.showToast({
        title: '相机启动失败',
        icon: 'none'
      })
      console.error('相机错误：', e)
    },
    switchCamera() {
      this.devicePosition = this.devicePosition === 'back' ? 'front' : 'back'
    },
    takePhoto() {
      const ctx = uni.createCameraContext()
      ctx.takePhoto({
        quality: 'high',
        success: (res) => {
          this.previewImage = res.tempImagePath
        },
        fail: (err) => {
          uni.showToast({
            title: '拍照失败',
            icon: 'none'
          })
          console.error('拍照错误：', err)
        }
      })
    },
    chooseImage() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          this.previewImage = res.tempFilePaths[0]
        }
      })
    },
    retakePhoto() {
      this.previewImage = ''
    },
    confirmPhoto() {
      // 根据当前拍摄的照片类型保存照片
      if(this.currentPhotoType === 'product') {
        this.productPhoto = this.previewImage;
        // 切换到配料表拍摄
        this.currentPhotoType = 'ingredient';
        this.previewImage = '';
        
        // 提示用户拍摄配料表
        uni.showToast({
          title: '请继续拍摄配料表',
          icon: 'none',
          duration: 2000
        });
      } else {
        // 已拍摄完配料表照片，开始处理两张照片
        this.ingredientPhoto = this.previewImage;
        this.uploadPhotos();
      }
    },
    
    // 上传两张照片
    uploadPhotos() {
      // 显示加载提示
      uni.showLoading({
        title: '处理图片中...'
      });
      
      // 获取用户openid
      const openid = uni.getStorageSync('user_openid');
      if (!openid) {
        uni.hideLoading();
        uni.showToast({
          title: '用户身份验证失败',
          icon: 'none'
        });
        return;
      }
      
      // 创建变量存储处理进度
      let uploadCount = 0;
      const totalUploads = 2;
      
      // 处理商品照片
      this.processAndUploadImage(this.productPhoto, 'product', openid, () => {
        uploadCount++;
        checkAllUploaded();
      });
      
      // 处理配料表照片
      this.processAndUploadImage(this.ingredientPhoto, 'ingredient', openid, () => {
        uploadCount++;
        checkAllUploaded();
      });
      
      // 检查是否所有照片都已上传
      const checkAllUploaded = () => {
        if (uploadCount === totalUploads) {
          this.analyzeImages(openid);
        }
      };
    },
    
    // 处理并上传单张图片
    processAndUploadImage(imagePath, type, openid, callback) {
      // 压缩图片
      uni.compressImage({
        src: imagePath,
        quality: 60,
        compressedWidth: 800,
        success: (res) => {
          // 获取当前日期
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const timestamp = now.getTime();
          const random = Math.floor(Math.random() * 1000);
          
          // 构建云存储路径
          const cloudPath = `user_images/${openid}/${year}/${month}/${timestamp}_${type}_${random}.jpg`;
          
          // 上传图片到云存储
          uniCloud.uploadFile({
            filePath: res.tempFilePath,
            cloudPath: cloudPath,
            success: (uploadRes) => {
              // 保存文件ID
              this.uploadedFiles[type] = uploadRes.fileID;
              console.log(`${type}照片上传成功:`, uploadRes.fileID);
              callback();
            },
            fail: (err) => {
              console.error(`上传${type}照片失败:`, err);
              uni.hideLoading();
              uni.showToast({
                title: `上传${type === 'product' ? '商品' : '配料表'}照片失败`,
                icon: 'none'
              });
            }
          });
        },
        fail: (err) => {
          console.error(`压缩${type}照片失败:`, err);
          uni.hideLoading();
          uni.showToast({
            title: `图片处理失败`,
            icon: 'none'
          });
        }
      });
    },
    
    // 分析两张图片
    analyzeImages(openid) {
      // 准备临时分析数据（显示"分析中"状态）
      const pendingAnalysis = {
        fileID: this.uploadedFiles.ingredient, // 使用配料表图片作为主图片ID
        productImageID: this.uploadedFiles.product, // 额外保存商品名称图片ID
        name: '分析中...',
        image: this.uploadedFiles.product, // 使用商品图片作为显示图片
        date: new Date().toLocaleString(),
        isFavorite: false,
        isPending: true, // 标记为分析中状态
        analysis: {
          score: 0,
          scoreTitle: '分析中...',
          scoreDesc: '数据正在处理，请稍候（大约需要30秒）',
          ingredients: [],
          nutritionDesc: '分析中...',
          suitablePeople: '分析中...'
        }
      };
      
      // 保存临时分析数据
      const pendingList = uni.getStorageSync('pendingAnalyses') || [];
      pendingList.unshift(pendingAnalysis); // 添加到列表头部
      uni.setStorageSync('pendingAnalyses', pendingList);
      
      // 隐藏加载提示
      uni.hideLoading();
      
      // 显示提示
      uni.showToast({
        title: '分析大约需要30秒，正在跳转首页',
        icon: 'none',
        duration: 2000
      });
      
      // 马上返回到home页
      setTimeout(() => {
        uni.switchTab({
          url: '/pages/home/home'
        });
      }, 2000);
      
      // 在后台调用云函数分析配料表和商品照片
      uniCloud.callFunction({
        name: 'imgUploadAndAnalyze',
        data: {
          fileID: this.uploadedFiles.ingredient, // 配料表图片ID
          productImageID: this.uploadedFiles.product, // 商品图片ID
          openid: openid
        },
        success: (callRes) => {
          console.log('分析结果:', callRes.result);
          
          // 分析完成后，从临时列表中移除
          const updatedPendingList = uni.getStorageSync('pendingAnalyses') || [];
          const index = updatedPendingList.findIndex(item => item.fileID === this.uploadedFiles.ingredient);
          if (index > -1) {
            updatedPendingList.splice(index, 1);
            uni.setStorageSync('pendingAnalyses', updatedPendingList);
          }
          
          // 无需进一步处理，数据库记录会通过home页面的刷新加载
        },
        fail: (err) => {
          console.error('分析配料表和商品照片失败:', err);
          
          // 分析失败后，更新临时列表中的状态
          const updatedPendingList = uni.getStorageSync('pendingAnalyses') || [];
          const index = updatedPendingList.findIndex(item => item.fileID === this.uploadedFiles.ingredient);
          if (index > -1) {
            updatedPendingList[index].analysis.scoreTitle = '分析失败';
            updatedPendingList[index].analysis.scoreDesc = '请重新尝试';
            uni.setStorageSync('pendingAnalyses', updatedPendingList);
          }
        }
      });
    }
  }
}
</script>

<style lang="scss">
.container {
  height: 100vh;
  background-color: #000;
  display: flex;
  flex-direction: column;
}

.camera {
  flex: 1;
  width: 100%;
  position: relative;
}

.scan-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  
  .corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border-color: #4CAF50;
    border-style: solid;
    
    &.top-left {
      top: -2px;
      left: -2px;
      border-width: 2px 0 0 2px;
    }
    
    &.top-right {
      top: -2px;
      right: -2px;
      border-width: 2px 2px 0 0;
    }
    
    &.bottom-left {
      bottom: -2px;
      left: -2px;
      border-width: 0 0 2px 2px;
    }
    
    &.bottom-right {
      bottom: -2px;
      right: -2px;
      border-width: 0 2px 2px 0;
    }
  }
}

.tips {
  position: absolute;
  bottom: 120px;
  left: 0;
  right: 0;
  text-align: center;
  color: white;
  
  text {
    display: block;
    font-size: 14px;
    margin-bottom: 8px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  
  .photo-step {
    font-size: 16px;
    color: #4CAF50;
    font-weight: bold;
    margin-top: 8px;
  }
}

.bottom-bar {
  height: 120px;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 20px;
}

.action-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .iconfont {
    font-size: 24px;
    color: white;
  }
}

.capture-btn {
  width: 70px;
  height: 70px;
  border-radius: 35px;
  border: 4px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .inner-circle {
    width: 60px;
    height: 60px;
    border-radius: 30px;
    background-color: white;
  }
}

.preview-area {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #000;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.preview-title {
  padding: 15px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.7);
}

.preview-image {
  flex: 1;
  width: 100%;
}

.preview-actions {
  height: 120px;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 20px;
}

.preview-btn {
  width: 120px;
  height: 44px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  
  &.retake {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
  }
  
  &.confirm {
    background-color: #4CAF50;
    color: white;
  }
}
</style> 