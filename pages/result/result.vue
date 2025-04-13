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
      <view class="summary-card">
        <view class="star-rating">
          <image src="/static/images/star.svg" mode="aspectFit" class="star"></image>
        </view>
        <view class="summary-info">
          <text class="summary-title">{{foodInfo.scoreTitle}}</text>
     <!--     <text class="summary-desc">{{foodInfo.scoreDesc}}</text> -->
        </view>
      </view>
      
      <!-- 配料列表 -->
      <view class="detail-section">
        <view class="detail-title">
          <text class="iconfont icon-list"></text>
          <text>配料列表分析</text>
        </view>
        <view class="ingredient-list">
          <view 
            class="ingredient-item"
            v-for="(item, index) in foodInfo.ingredients"
            :key="index"
          >
            <text class="ingredient-name">{{item.name}}</text>
          <!--  <text class="ingredient-function">{{item.description}}</text>
            <view class="ingredient-safety" :class="item.riskLevel">
              {{item.riskLevel === 'high' ? '风险' : item.riskLevel === 'medium' ? '谨慎' : '安全'}}
            </view> -->
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
  </view>
</template>

<script>
export default {
  data() {
    return {
      isFavorite: false,
      imageId: '',
      analysisId: '',
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
      _checkedFavoriteInLoad: false
    }
  },
  onLoad(options) {
    console.log('==result==', options);
    
    // 尝试从本地存储获取完整分析数据
    const completeData = uni.getStorageSync('completeAnalysisData');
    
    if (completeData) {
      console.log('从缓存获取到完整数据:', completeData);
      
      // 设置页面数据
      this.imageId = completeData.imageId || '';
      this.analysisId = completeData.analysisId || '';
      
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
        this.foodInfo.name = analysis.scoreTitle || '未知产品';
        
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
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.star-rating {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 30px;
  margin-left: 10px;
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
}

.summary-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
  display: block;
}

.summary-desc {
  color: #333;
  font-size: 15px;
  line-height: 1.5;
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
  padding: 16px; /* 增加内边距，从12px改为16px */
  margin-bottom: 16px; /* 增加卡片间距，从12px改为16px */
}

.card-title {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 12px; /* 增加标题与内容间距，从8px改为12px */
  color: #333;
  display: block; /* 确保标题是块级元素，独占一行 */
}

.section-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6; /* 增加行高，从1.5改为1.6 */
  display: block; /* 确保内容是块级元素 */
  white-space: pre-line; /* 保留文本中的换行符 */
}

.tab-bar {
  display: none;
}

.ingredient-modal {
  display: none; /* Hide the modal */
}
</style> 