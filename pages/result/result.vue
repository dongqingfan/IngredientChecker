<template>
  <view class="container">
    <!-- 头部 -->
    <view class="header">
      <view class="back-btn" @tap="goBack">
        <text class="iconfont icon-back"></text>
      </view>
      <text class="title">配料分析</text>
    </view>
    
    <!-- 内容区 -->
    <scroll-view class="content" scroll-y>
      <!-- 食品标题和操作按钮 -->
      <view class="result-header">
        <text class="result-title">{{foodInfo.name}}</text>
        <view class="action-buttons">
          <view class="text-btn favorite-btn" @tap="toggleFavorite" :class="{'is-favorite': isFavorite}">
            <text>{{isFavorite ? '已收藏' : '收藏'}}</text>
          </view>
        </view>
      </view>
      
      <!-- 安全评分卡片 -->
      <view class="summary-card" :class="{'error-card': isErrorState}">
        <!-- 错误状态显示 -->
        <template v-if="isErrorState">
          <view class="error-content">
            <view class="error-icon-container">
              <image src="/static/icon/error-face.png" mode="aspectFit" class="error-icon"></image>
            </view>
            <view class="error-message">
              <text class="error-title">{{foodInfo.scoreTitle}}</text>
              <text class="error-desc" v-if="foodInfo.scoreDesc">{{foodInfo.scoreDesc}}</text>
            </view>
          </view>
          <!-- 产品图片 -->
          <view class="product-preview" v-if="productImageID" @tap.stop="openImageBrowser">
            <image :src="productImageID" mode="aspectFill" class="product-img"></image>
          </view>
        </template>
        
        <!-- 正常状态显示 -->
        <template v-else>
          <view class="star-rating">
            <image 
              :src="'/static/icon/' + (foodInfo.score > 0 ? 'low.png' : 'high.png')" 
              mode="aspectFit" 
              class="star"
            ></image>
          </view>
          <view class="summary-info">
            <view class="title-with-image">
              <text class="summary-title">{{foodInfo.scoreTitle}}</text>
              <view class="product-image-preview" @tap.stop="openImageBrowser">
                <image :src="productImageID || '/static/images/placeholder.jpg'" mode="aspectFill" class="preview-thumb"></image>
              </view>
            </view>
            <!-- <text class="summary-desc" v-if="foodInfo.scoreDesc">{{foodInfo.scoreDesc}}</text> -->
          </view>
        </template>
      </view>
      
      <!-- 配料列表 -->
      <view class="detail-section">
        <view class="detail-title">
          <text class="iconfont icon-list"></text>
          <text>配料列表分析1</text>
        </view>
        <view class="ingredient-list">
          <view 
            class="ingredient-item"
            v-for="(item, index) in foodInfo.ingredients"
            :key="index"
            @tap="showIngredientDetail(item)"
          >
            <text class="ingredient-name">{{item.name}}</text>
           <text class="ingredient-function">{{item.category}}</text>
            <view class="ingredient-safety" :class="item.riskLevel">
              {{item.riskLevel === 'high' ? '风险' : item.riskLevel === 'medium' ? '谨慎' : '安全'}}
            </view>
          </view>
        </view>
      </view>
      
      <!-- 在配料列表区域和健康建议区域之间添加 -->
      <view class="detail-section" v-if="nutritionDetails">
        <view class="detail-title">
          <text class="iconfont icon-food"></text>
          <text>营养成分表 <text class="qty-unit">{{nutritionDetails.qtyUnit || ''}}</text></text>
        </view>
        <view class="nutrition-table">
          <view class="nutrition-row" v-for="(item, index) in nutritionDetails.nutritionInfo" :key="index">
            <text class="nutrition-name">{{item[0]}}</text>
            <text class="nutrition-value">{{item[1]}}</text>
            <text class="nutrition-percent">{{item[2]}}</text>
          </view>
        </view>
      </view>
      
      <!-- 健康建议 -->
     <view class="detail-section">
        <view class="detail-title">
          <text class="iconfont icon-heart"></text>
          <text>健康建议</text>
        </view>
        <view class="detail-card">
          <text class="card-title">营养评估</text>
          <text class="section-content">{{foodInfo.nutritionDesc}}</text>
        </view>
        <view class="detail-card">
          <text class="card-title">适宜人群</text>
          <text class="section-content">{{foodInfo.suitablePeople}}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 配料详情模态窗口 -->
    <view class="ingredient-modal" v-if="showModal">
      <view class="modal-mask" @tap="hideIngredientDetail"></view>
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">{{currentIngredient.name}}</text>
          <text class="modal-close" @tap="hideIngredientDetail">×</text>
        </view>
        
        <view class="modal-body">
          <view class="detail-item">
            <text class="detail-label">成分类别</text>
            <text class="detail-value">{{currentIngredient.category || '未知'}}</text>
          </view>
          
          <view class="detail-item">
            <text class="detail-label">主要用途</text>
            <text class="detail-value">{{currentIngredient.usage || currentIngredient.description || '未知'}}</text>
          </view>
          
          <view class="detail-item" v-if="currentIngredient.risks">
            <text class="detail-label">可能风险</text>
            <text class="detail-value">{{currentIngredient.risks}}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 图片浏览模态窗口 -->
    <view class="image-browser-modal" v-if="showImageBrowser">
      <view class="modal-mask" @tap="hideImageBrowser"></view>
      <view class="modal-image-content">
        <view class="image-browser-header">
          <text class="image-browser-title">{{
            currentImageIndex === 0 ? '商品图片' : 
            currentImageIndex === 1 ? '配料表图片' : 
            '营养成分表图片'
          }}</text>
          <text class="modal-close" @tap="hideImageBrowser">×</text>
        </view>
        
        <swiper class="image-swiper" :current="currentImageIndex" @change="swiperChange">
          <swiper-item>
            <image 
              :src="productImageID || '/static/images/placeholder.jpg'" 
              mode="aspectFit" 
              class="fullscreen-image"
            ></image>
          </swiper-item>
          <swiper-item>
            <image 
              :src="productIngredientID || '/static/images/placeholder.jpg'" 
              mode="aspectFit" 
              class="fullscreen-image"
            ></image>
          </swiper-item>
          <swiper-item v-if="nutritionImageID">
            <image 
              :src="nutritionImageID || '/static/images/placeholder.jpg'" 
              mode="aspectFit" 
              class="fullscreen-image"
            ></image>
          </swiper-item>
        </swiper>
        
        <view class="image-indicators">
          <view 
            class="indicator-dot" 
            v-for="(_, index) in getImageCount()" 
            :key="index"
            :class="{'active': currentImageIndex === index}"
          ></view>
        </view>
        
        <view class="swipe-hint">左右滑动切换图片</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      isFavorite: false,
      imageId: '',
      analysisId: '',
      productName: '',
      brandName: '',
      productType: '',
      productImageID: '',
      productIngredientID: '',
      nutritionImageID: '',
      nutritionDetails: null,
      foodInfo: {
        name: '加载中...',
        score: 0,
        scoreTitle: '分析中...',
        scoreDesc: '正在分析食品安全性...',
        nutritionDesc: '正在分析营养信息...',
        suitablePeople: '正在分析适宜人群...',
        alternativeDesc: '正在分析替代建议...',
        ingredients: []
      },
      analysisData: {},
      _checkedFavoriteInLoad: false,
      showModal: false,
      currentIngredient: {},
      showImageBrowser: false,
      currentImageIndex: 0
    }
  },
  computed: {
    // 判断是否为错误状态
    isErrorState() {
      const errorTitles = [
        '无法分析配料表', 
        '无法识别配料表',
        '配料表分析失败'
      ];
      return errorTitles.some(title => this.foodInfo.scoreTitle.includes(title));
    },
    // 计算有多少张图片
    imageCount() {
      let count = 0;
      if (this.productImageID) count++;
      if (this.productIngredientID) count++;
      if (this.nutritionImageID) count++;
      return Math.max(count, 1); // 至少返回1，避免0的情况
    }
  },
  onLoad(options) {
    console.log('==result==', options);
    
    // 尝试从本地存储获取完整分析数据
    const completeData = uni.getStorageSync('completeAnalysisData');
    
    if (completeData) {
      // 设置页面数据
      this.imageId = completeData.imageId || '';
      this.analysisId = completeData.analysisId || '';
      
      // 保存商品信息
      this.productName = completeData.productName || '';
      this.brandName = completeData.brandName || '';
      this.productType = completeData.productType || '';
      
      // 保存图片ID
      this.productImageID = completeData.productImageID || '';
      this.productIngredientID = completeData.productIngredientID || '';
      this.nutritionImageID = completeData.nutritionImageID || '';
      
      // 如果有ID，查询完整数据以获取可能的nutritionImageID
      if (completeData.id || completeData.analysisId) {
        const dbId = completeData.id || completeData.analysisId;
        this.getCompleteDataFromDB(dbId);
      }
      
      // 如果有收藏状态，直接设置
      if (completeData.isFavorite !== undefined) {
        this.isFavorite = completeData.isFavorite;
      }
      
      // 处理分析数据
      if (completeData.analysis) {
        this.processAnalysisData(completeData.analysis);
      }
      
      // 如果有错误信息，显示提示
      if (completeData.error) {
        uni.showToast({
          title: completeData.errorMsg || '分析失败',
          icon: 'none',
          duration: 2000
        });
      }
      
      // 清除缓存数据，避免影响下次分析
      uni.removeStorageSync('completeAnalysisData');
    } 
    // 兼容处理：如果没有从completeData获取到数据，尝试通过URL参数获取
    else if (options.imageId) {
      this.imageId = options.imageId;
      
      if (options.analysisId) {
        this.analysisId = options.analysisId;
        // 如果有analysisId，查询完整数据
        this.getCompleteDataFromDB(options.analysisId);
      }
      
      // 尝试从ingredientAnalysis获取数据(兼容旧版本)
      const analysis = uni.getStorageSync('ingredientAnalysis');
      if (analysis) {
        this.processAnalysisData(analysis);
        uni.removeStorageSync('ingredientAnalysis');
      } else if (this.imageId) {
        // 如果没有缓存数据，则通过云函数获取
        this.getAnalysisFromCloud(this.imageId);
      }
    } else {
      // 没有任何可用的数据源
      uni.showToast({
        title: '未找到分析数据',
        icon: 'none'
      });
    }
    
    // 如果有analysisId但没有设置isFavorite，检查收藏状态
    if (this.analysisId && this.isFavorite === false) {
      this.checkIfFavoriteFromCloud();
      this._checkedFavoriteInLoad = true;
    }
  },
  onShow() {
    // 如果有analysisId但没有通过completeData设置isFavorite，检查收藏状态
    if (this.analysisId && !this._checkedFavoriteInLoad) {
      this.checkIfFavoriteFromCloud();
    }
  },
  methods: {
    processAnalysisData(analysis) {
      try {
        // 确保analysis是对象，如果是字符串则尝试解析
        if (typeof analysis === 'string') {
          try {
            analysis = JSON.parse(analysis);
          } catch (e) {
            console.error('JSON解析错误:', e);
            // 尝试修复单引号问题
            const fixedJson = analysis.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
                                      .replace(/'/g, '"');
            analysis = JSON.parse(fixedJson);
          }
        }
        
        // 将分析结果转换为页面显示数据
        // 优先使用从completeData获取的商品名称，其次是分析结果中的评分标题
        this.foodInfo.name = this.productName || analysis.scoreTitle || '未知产品';
        
        // 处理评分
        this.foodInfo.score = analysis.score || 0;
        this.foodInfo.scoreTitle = analysis.scoreTitle || '';
        this.foodInfo.scoreDesc = analysis.scoreDesc || '';
        
        // 处理配料数据
        if (analysis.ingredients && Array.isArray(analysis.ingredients)) {
          this.foodInfo.ingredients = analysis.ingredients.map(item => {
            // 直接使用AI返回的字段，结构已经匹配
            return {
              name: item.name || '',
              description: item.description || '',
              riskLevel: item.riskLevel || 'low',
              category: item.category || '',
              usage: item.usage || '',
              risks: item.risks || ''
            };
          });
        }
        
        // 健康建议
        this.foodInfo.nutritionDesc = analysis.nutritionDesc || '';
        this.foodInfo.suitablePeople = analysis.suitablePeople || '';
        
        // 格式化适宜人群文本，添加适当的换行
        let suitableText = this.foodInfo.suitablePeople;
        if (suitableText.includes('适宜人群：')) {
          // 替换中文冒号后面的内容为换行
          suitableText = suitableText.replace(/适宜人群：/g, '适宜人群：\n');
        }
        if (suitableText.includes('不适宜人群：')) {
          // 替换中文冒号后面的内容为换行
          suitableText = suitableText.replace(/不适宜人群：/g, '\n不适宜人群：\n');
        }
        if (suitableText.includes('。')) {
          // 在句号后添加换行
          suitableText = suitableText.replace(/。(?!$)/g, '。\n');
        }
        this.foodInfo.suitablePeople = suitableText;
        
        // 保存到本地收藏数据的准备工作
        this.analysisData = {
          score: analysis.score,
          scoreTitle: analysis.scoreTitle,
          timestamp: new Date().getTime(),
          imageId: this.imageId
        };
        
        // 检查是否为收藏项
        this.checkIfFavoriteFromCloud();
        
        console.log('分析数据处理完成:', this.foodInfo);
      } catch (error) {
        console.error('处理分析数据失败:', error);
        uni.showToast({
          title: '数据处理失败',
          icon: 'none'
        });
      }
    },
    getAnalysisFromCloud(fileID) {
      // 显示加载提示
      uni.showLoading({
        title: '获取分析结果...'
      });
      
      // 调用云函数获取分析结果
      uniCloud.callFunction({
        name: 'imgUploadAndAnalyze',
        data: {
          fileID: fileID
        },
        success: (res) => {
          if (res.result && res.result.code === 0) {
            this.processAnalysisData(res.result.data);
            
            // 如果返回了记录ID，保存它
            if (res.result.analysis_id) {
              this.analysisId = res.result.analysis_id;
              // 检查收藏状态
              this.checkIfFavoriteFromCloud();
            }
          } else {
            uni.showToast({
              title: '获取分析失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('获取分析失败:', err);
          uni.showToast({
            title: '获取分析失败',
            icon: 'none'
          });
        },
        complete: () => {
          uni.hideLoading();
        }
      });
    },
    goBack() {
      // 获取页面栈
      const pages = getCurrentPages()
      
      // 检查页面栈中是否有home或favorites页面
      const originPage = pages.find(page => {
        const route = page.route || page.__route__
        return route && (route.includes('/home/') || route.includes('/favorites/'))
      })
      
      if (originPage) {
        // 如果存在原始页面，返回到该页面
        const delta = pages.length - pages.indexOf(originPage) - 1
        uni.navigateBack({
          delta: delta > 0 ? delta : 1
        })
      } else {
        // 否则直接返回首页
        uni.switchTab({
          url: '/pages/home/home'
        })
      }
    },
    toggleFavorite() {
      try {
        // 检查分析ID是否存在
        if (!this.analysisId) {
          console.log('分析ID不存在，尝试先保存记录');
          // 显示加载提示
          uni.showLoading({
            title: '处理中...'
          });
          
          // 获取用户openid
          const openid = uni.getStorageSync('user_openid');
          if (!openid) {
            uni.hideLoading();
            uni.showToast({
              title: '请先登录',
              icon: 'none'
            });
            return;
          }
          
          // 先调用云函数保存当前分析数据
          uniCloud.callFunction({
            name: 'imgUploadAndAnalyze',
            data: {
              fileID: this.imageId,
              openid: openid,
              saveOnly: true,  // 仅保存记录，不重新分析
              analysis: this.foodInfo  // 传递当前分析数据
            },
            success: (res) => {
              if (res.result && res.result.code === 0 && res.result.analysis_id) {
                // 保存分析ID
                this.analysisId = res.result.analysis_id;
                console.log('成功获取并设置分析ID:', this.analysisId);
                // 重新调用收藏方法
                this.doToggleFavorite();
              } else {
                uni.hideLoading();
                uni.showToast({
                  title: '无法获取分析ID',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              uni.hideLoading();
              console.error('保存分析记录失败:', err);
              uni.showToast({
                title: '操作失败',
                icon: 'none'
              });
            }
          });
          return;
        }
        
        // 如果已有分析ID，直接执行收藏逻辑
        this.doToggleFavorite();
      } catch (e) {
        uni.hideLoading();
        console.error('更新收藏失败:', e);
        uni.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    },
    
    // 执行实际的收藏/取消收藏操作
    doToggleFavorite() {
      // 显示加载提示
      uni.showLoading({
        title: this.isFavorite ? '取消收藏中...' : '收藏中...'
      });
      
      // 获取用户openid
      const openid = uni.getStorageSync('user_openid');
      if (!openid) {
        uni.hideLoading();
        uni.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
      
      // 构造收藏数据
      const favoriteData = {
        openid: openid,
        analysis_id: this.analysisId
      };
      
      console.log('收藏数据:', favoriteData);
      
      // 调用云函数处理收藏
      uniCloud.callFunction({
        name: 'toggleFavorite',
        data: {
          action: this.isFavorite ? 'remove' : 'add',
          favoriteData: favoriteData
        },
        success: (res) => {
          uni.hideLoading();
          
          if (res.result && res.result.code === 0) {
            // 切换收藏状态
            this.isFavorite = !this.isFavorite;
            
            uni.showToast({
              title: this.isFavorite ? '已添加到收藏' : '已取消收藏',
              icon: 'success'
            });
          } else {
            console.error('收藏操作失败:', res.result);
            uni.showToast({
              title: res.result?.message || '操作失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          uni.hideLoading();
          console.error('收藏操作失败:', err);
          
          uni.showToast({
            title: '网络错误，请稍后再试',
            icon: 'none'
          });
        }
      });
    },
    goToHome() {
      uni.switchTab({
        url: '/pages/home/home'
      })
    },
    goToFavorites() {
      uni.switchTab({
        url: '/pages/favorites/favorites'
      })
    },
    goToProfile() {
      uni.switchTab({
        url: '/pages/profile/profile'
      })
    },
    // 从云端检查当前食品是否已收藏
    checkIfFavoriteFromCloud() {
      const openid = uni.getStorageSync('user_openid');
      if (!openid || !this.analysisId) {
        // 如果没有openid或者分析记录ID，无法检查收藏状态
        this.isFavorite = false;
        return;
      }
      
      uniCloud.callFunction({
        name: 'toggleFavorite',
        data: {
          action: 'check',
          favoriteData: {
            openid: openid,
            analysis_id: this.analysisId
          }
        },
        success: (res) => {
          if (res.result && res.result.code === 0) {
            this.isFavorite = res.result.isFavorite;
          }
        },
        fail: () => {
          // 云函数调用失败，默认为未收藏
          this.isFavorite = false;
        }
      });
    },
    showIngredientDetail(item) {
      this.currentIngredient = item;
      this.showModal = true;
    },
    hideIngredientDetail() {
      this.showModal = false;
    },
    
    // 图片浏览相关方法
    showImageBrowser() {
      console.log('显示图片浏览器');
      this.currentImageIndex = 0; // 默认显示商品图片
      this.showImageBrowser = true;
    },
    hideImageBrowser() {
      this.showImageBrowser = false;
    },
    swiperChange(e) {
      this.currentImageIndex = e.detail.current;
    },
    // 获取图片数量，用于显示指示点
    getImageCount() {
      let count = 2; // 默认有商品图和配料表图
      if (this.nutritionImageID) count = 3; // 如果有营养成分表图，则共3张
      return count;
    },
    // 使用uni.previewImage替代自定义模态窗口
    openImageBrowser() {
      console.log('openImageBrowser 被调用，准备预览图片');
      
      // 创建图片数组
      const urls = [];
      
      // 添加商品图片
      if(this.productImageID) {
        urls.push(this.productImageID);
      }
      
      // 添加配料图片
      if(this.productIngredientID) {
        urls.push(this.productIngredientID);
      }
      
      // 添加营养成分表图片
      if(this.nutritionImageID) {
        urls.push(this.nutritionImageID);
      }
      
      // 如果没有任何图片，显示提示并返回
      if(urls.length === 0) {
        uni.showToast({
          title: '无可预览图片',
          icon: 'none'
        });
        return;
      }
      
      // 调用uni的预览图片API
      uni.previewImage({
        urls: urls,
        current: 0, // 默认显示第一张图片(商品图片)
        success: () => {
          console.log('图片预览成功打开');
        },
        fail: (err) => {
          console.error('图片预览失败:', err);
          uni.showToast({
            title: '图片预览失败',
            icon: 'none'
          });
        }
      });
    },
    // 从数据库获取完整数据
    async getCompleteDataFromDB(id) {
      try {
        const db = uniCloud.database();
        const { result } = await db.collection('ingredient_analyses')
          .doc(id)
          .get();
        
        console.log('从数据库获取到的数据:', result);
        
        if (result && result.data && result.data.length > 0) {
          const data = result.data[0];
          
          // 更新nutritionImageID
          if (data.nutritionImageID) {
            this.nutritionImageID = data.nutritionImageID;
            console.log('从数据库获取到营养成分表图片ID:', this.nutritionImageID);
          }
          
          // 更新其他可能的字段
          if (data.productImageID && !this.productImageID) {
            this.productImageID = data.productImageID;
          }
          
          if (data.productIngredientID && !this.productIngredientID) {
            this.productIngredientID = data.productIngredientID;
          }
          
          // 更新商品信息
          if (data.productName && !this.productName) {
            this.productName = data.productName;
          }
          
          if (data.brandName && !this.brandName) {
            this.brandName = data.brandName;
          }
          
          if (data.productType && !this.productType) {
            this.productType = data.productType;
          }
          if (data.nutritionDetails && data.nutritionDetails.nutritionInfo) {
            this.nutritionDetails = data.nutritionDetails;
            console.log('营养成分表数据有效:', this.nutritionDetails);
          }
          console.log('从数据库获取到的数据:', this.nutritionDetails);
        }
      } catch (error) {
        console.error('从数据库获取完整数据失败:', error);
      }
    }
  }
}
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.header {
  height: 56px;
  background-color: #4CAF50;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 18px;
  font-weight: bold;
  padding-top: 44px;
  box-sizing: content-box;
  
  .back-btn {
    display: flex;
    align-items: center;
    margin-right: 16px;
    padding: 8px;
    
    .iconfont {
      font-size: 28px;
      color: white;
    }
  }
  
  .title {
    flex: 1;
    text-align: center;
  }
  
  .iconfont {
    font-size: 24px;
    color: white;
  }
}

.content {
  flex: 1;
  padding: 16px;
  padding-bottom: 32px;
  box-sizing: border-box;
  width: 100%;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.result-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.text-btn {
  min-width: 64px;
  height: 36px;
  border-radius: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  padding: 0 16px;
  
  &.favorite-btn {
    position: relative;
    transition: all 0.2s ease;
    background-color: transparent;
    color: #4CAF50;
    
    &:active {
      transform: scale(0.95);
    }
    
    &.is-favorite {
      background-color: transparent;
      color: #4CAF50;
      font-weight: bold;
    }
  }
}

.summary-card {
  background-color: white;
  border-radius: 12px;
  padding: 4vw;
  margin-bottom: 4vw;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: flex-start;
  width: 100%;
  box-sizing: border-box;
}

/* 错误状态卡片样式 */
.error-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.error-content {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  width: 100%;
}

.error-icon-container {
  margin-right: 15px;
  flex-shrink: 0;
}

.error-icon {
  width: 50px;
  height: 50px;
}

.error-message {
  flex: 1;
}

.error-title {
  font-size: 18px;
  font-weight: bold;
  color: #e53935;
  margin-bottom: 4px;
  display: block;
}

.error-desc {
  font-size: 14px;
  color: #666;
  display: block;
  line-height: 1.4;
}

.product-preview {
  align-self: center;
  margin-top: 10px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.product-img {
  width: 200px;
  height: 150px;
  background-color: #f5f5f5;
}

/* 正常状态样式 */
.star-rating {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 30px;
  margin-left: 10px;
  min-width: 55px;
}

.star {
  width: 55px;
  height: 55px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.star-score {
  position: absolute;
  font-weight: bold;
  font-size: 24px;
  color: white;
  z-index: 1;
}

.summary-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.title-with-image {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  width: 100%;
}

.summary-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  flex: 1;
  padding-right: 15px;
  word-break: break-word;
}

.product-image-preview {
  position: relative;
  margin-left: 10px;
  flex-shrink: 0;
}

.preview-thumb {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background-color: #f9f9f9;
}

.preview-badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  background-color: #4CAF50;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 6px;
  white-space: nowrap;
}

.summary-desc {
  color: #333;
  font-size: 15px;
  line-height: 1.5;
  margin-top: 5px;
  clear: both;
  width: 100%;
  word-break: break-word;
}

.detail-section {
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  width: 100%;
}

.detail-title {
  font-size: 17px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #333;
  display: flex;
  align-items: center;
  
  .iconfont {
    margin-right: 10px;
    color: #4CAF50;
    font-size: 18px;
  }
}

.ingredient-list {
  margin-bottom: 12px;
  background-color: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  width: 100%;
}

.ingredient-item {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 12px 5px;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.ingredient-name {
  font-size: 14px;
  color: #333;
  width: 35%;
  padding-right: 10px;
  font-weight: 500;
}

.ingredient-function {
  font-size: 12px;
  color: #999;
  width: 35%;
  text-align: left;
  padding-left: 5px;
  padding-right: 10px;
  font-weight: 300;
  opacity: 0.8;
}

.ingredient-safety {
  font-size: 13px;
  font-weight: bold;
  padding: 5px 12px;
  border-radius: 16px;
  width: 25%;
  text-align: center;
  display: inline-block;
  z-index: 1;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  
  &.low {
    color: white;
    background-color: #4CAF50;
    box-shadow: 0 1px 3px rgba(76, 175, 80, 0.3);
  }
  
  &.medium {
    color: #333;
    background-color: #FFC107;
    box-shadow: 0 1px 3px rgba(255, 193, 7, 0.3);
  }
  
  &.high {
    color: white;
    background-color: #F44336;
    box-shadow: 0 1px 3px rgba(244, 67, 54, 0.3);
  }
}

.detail-card {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #333;
  display: block;
}

.section-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  display: block;
  white-space: pre-line;
}

.tab-bar {
  display: none;
}

.ingredient-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.modal-content {
  width: 90%;
  max-width: 680rpx;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  z-index: 2;
  position: relative;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 18px;
  background-color: #fff;
  color: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.modal-close {
  font-size: 22px;
  color: #999;
  width: 28px;
  height: 28px;
  line-height: 26px;
  text-align: center;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.detail-item {
  margin-bottom: 14px;
  border-bottom: 1px solid #f2f2f2;
  padding-bottom: 14px;
}

.detail-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.detail-label {
  display: block;
  font-size: 15px;
  color: #999;
  margin-bottom: 6px;
}

.detail-value {
  display: block;
  font-size: 16px;
  color: #333;
  line-height: 1.5;
}

.safety-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: bold;
  font-size: 14px;
  
  &.low {
    background-color: rgba(76, 175, 80, 0.15);
    color: #2E7D32;
  }
  
  &.medium {
    background-color: rgba(255, 193, 7, 0.15);
    color: #F57F17;
  }
  
  &.high {
    background-color: rgba(244, 67, 54, 0.15);
    color: #D32F2F;
  }
}

.usage-suggestions {
  background-color: #f9f9f9;
  padding: 12px;
  border-radius: 8px;
  margin-top: 16px;
}

.suggestion-list {
  margin-top: 8px;
}

.suggestion-item {
  display: block;
  font-size: 14px;
  color: #555;
  margin-bottom: 6px;
  line-height: 1.4;
}

/* 图片浏览器样式 */
.image-browser-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-image-content {
  width: 100%;
  height: 100%;
  background-color: #000;
  z-index: 2;
  position: relative;
  display: flex;
  flex-direction: column;
}

.image-browser-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  width: 100%;
  box-sizing: border-box;
  padding-top: var(--status-bar-height);
}

.image-browser-title {
  color: white;
  font-size: 16px;
}

.image-swiper {
  flex: 1;
  width: 100%;
  height: 100%;
}

.fullscreen-image {
  width: 100%;
  height: 100%;
}

.image-indicators {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0;
  background-color: rgba(0, 0, 0, 0.7);
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.4);
  margin: 0 4px;
  transition: all 0.3s;
}

.indicator-dot.active {
  width: 16px;
  background-color: white;
}

.swipe-hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  text-align: center;
  padding-bottom: 12px;
  background-color: rgba(0, 0, 0, 0.7);
}

.nutrition-table {
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.nutrition-header {
  padding: 12px 16px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #eee;
}

.unit-info {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.nutrition-row {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.nutrition-row:last-child {
  border-bottom: none;
}

.nutrition-name {
  flex: 2;
  font-size: 14px;
  color: #333;
}

.nutrition-value {
  flex: 2;
  font-size: 14px;
  color: #666;
  text-align: right;
}

.nutrition-percent {
  flex: 1;
  font-size: 14px;
  color: #999;
  text-align: right;
}

.qty-unit {
  font-size: 13px;
  color: #888;
  font-weight: normal;
  margin-left: 4px;
}
</style> 