<template>
  <view class="container">
    <!-- 头部 -->
    <view class="header">
      <text class="title">我的收藏</text>
      <text class="iconfont icon-delete" @tap="clearFavorites"></text>
    </view>
    
    <!-- 搜索框 -->
    <view class="search-box">
      <view class="search-input">
        <text class="iconfont icon-search"></text>
        <input 
          type="text" 
          v-model="searchText" 
          placeholder="搜索收藏" 
          placeholder-class="placeholder"
          @input="handleSearch"
        />
      </view>
    </view>
    
    <!-- 内容区 -->
    <scroll-view class="content" scroll-y @scrolltolower="loadMore">
      <!-- 加载状态 -->
      <view class="loading-wrapper" v-if="loading">
        <view class="loading-indicator"></view>
        <text class="loading-text">加载中...</text>
      </view>
      
      <!-- 收藏列表 -->
      <view class="favorites-list" v-if="!loading && favoritesList.length > 0">
        <view 
          class="favorite-item"
          v-for="(item, index) in filteredFavorites"
          :key="index"
          @tap="goToResult(item)"
        >
          <image :src="item.image" mode="aspectFill" class="favorite-img" @error="setDefaultImage(item)"></image>
          <view class="favorite-info">
            <text class="favorite-name">{{item.name}}</text>
            <text class="favorite-date">{{item.date}}</text>
          </view>
          <view class="favorite-score" :class="getScoreClass(item.score)">
            <image src="/static/images/star.svg" mode="aspectFit"></image>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="!loading && favoritesList.length === 0">
        <image src="/static/images/empty-favorites.png" mode="aspectFit" class="empty-image"></image>
        <text class="empty-text">暂无收藏记录</text>
        <button class="scan-btn" @tap="goToCamera">立即扫描</button>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      searchText: '',
      loading: false,
      favoritesList: [],
      hasMore: true,
      page: 1,
      pageSize: 10
    }
  },
  computed: {
    filteredFavorites() {
      if (!this.searchText) {
        return this.favoritesList
      }
      const searchLower = this.searchText.toLowerCase()
      return this.favoritesList.filter(item => 
        (item.name && item.name.toLowerCase().includes(searchLower))
      )
    }
  },
  onLoad() {
    this.loadFavorites()
  },
  onShow() {
    // 每次页面显示时刷新数据
    this.refreshFavorites()
  },
  onPullDownRefresh() {
    this.refreshFavorites()
  },
  methods: {
    // 从云数据库加载收藏数据
    async loadFavorites() {
      if (this.loading || !this.hasMore) return;
      
      this.loading = true;
      
      try {
        // 获取用户openid
        const openid = uni.getStorageSync('user_openid');
        if (!openid) {
          uni.showToast({
            title: '请先登录',
            icon: 'none'
          });
          this.loading = false;
          return;
        }
        
        const db = uniCloud.database();
        const dbCmd = db.command;
        
        // 先从user_favorites获取收藏记录
        const favorites = await db.collection('user_favorites')
          .where({
            openid: openid
          })
          .orderBy('createdAt', 'desc')
          .skip((this.page - 1) * this.pageSize)
          .limit(this.pageSize)
          .get();
          
        console.log('获取收藏记录成功，完整数据结构:', JSON.stringify(favorites));
        
        // 检查是否有收藏记录
        if (!favorites.result || !favorites.result.data || favorites.result.data.length === 0) {
          console.warn('用户没有收藏记录');
          this.favoritesList = [];
          this.hasMore = false;
          this.loading = false;
          return;
        }
        
        // 获取所有分析记录ID
        const analysisIds = favorites.result.data.map(item => item.analysis_id);
        console.log('分析ID列表:', analysisIds);
        
        // 检查是否有有效的分析ID
        if (!analysisIds.length) {
          console.warn('没有有效的分析记录ID');
          this.favoritesList = [];
          this.hasMore = false;
          this.loading = false;
          return;
        }
        
        // 批量查询分析记录
        const analyses = await db.collection('ingredient_analyses')
          .where({
            _id: dbCmd.in(analysisIds)
          })
          .get();
          
        console.log('获取分析记录成功，完整数据结构:', JSON.stringify(analyses));
        
        // 建立分析记录映射，方便后续查找
        const analysisMap = {};
        
        if (analyses.result && analyses.result.data) {
          analyses.result.data.forEach(item => {
            analysisMap[item._id] = item;
          });
        } else {
          console.warn('没有找到匹配的分析记录');
        }
        
        // 合并两表数据
        const newItems = favorites.result.data.map(favorite => {
          // 获取对应的分析记录
          const analysis = analysisMap[favorite.analysis_id];
          
          // 格式化日期
          const date = favorite.createdAt ? new Date(favorite.createdAt) : new Date();
          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          
          // 如果没有找到分析记录，创建基本项
          if (!analysis) {
            console.warn(`未找到ID为${favorite.analysis_id}的分析记录，使用基础数据`);
            
            return {
              id: favorite._id,
              analysisId: favorite.analysis_id,
              name: '未知产品',
              score: 0,
              image: '/static/images/placeholder.jpg',
              date: formattedDate,
              analysis: {}
            };
          }
          
          // 从分析记录中获取数据
          return {
            id: favorite._id,
            analysisId: favorite.analysis_id,
            name: analysis.analysis?.scoreTitle || '未知产品',
            score: analysis.analysis?.score || 0,
            image: analysis.fileID || '/static/images/placeholder.jpg',
            date: formattedDate,
            analysis: analysis.analysis || {}
          };
        });
        
        console.log('处理后的收藏项:', newItems);
        
        // 添加到列表中
        if (this.page === 1) {
          this.favoritesList = newItems;
        } else {
          this.favoritesList = [...this.favoritesList, ...newItems];
        }
        
        // 判断是否还有更多数据
        this.hasMore = newItems.length === this.pageSize;
        
        // 增加页码
        if (newItems.length > 0) {
          this.page++;
        }
      } catch (error) {
        console.error('获取收藏失败:', error);
        uni.showToast({
          title: '获取收藏失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
        uni.stopPullDownRefresh();
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
      if (score >= 90) return 'score-high';
      if (score >= 70) return 'score-medium';
      return 'score-low';
    },
    
    // 跳转到结果页
    goToResult(item) {
      // 准备传递给result页面的完整数据
      const completeData = {
        analysis: item.analysis,
        imageId: item.image,
        analysisId: item.analysisId,
        isFavorite: true // 从收藏页进入，肯定是已收藏状态
      };
      
      // 缓存完整数据
      uni.setStorageSync('completeAnalysisData', completeData);
      
      // 跳转到result页面
      uni.navigateTo({
        url: `/pages/result/result?from=favorites`
      });
    },
    
    goToCamera() {
      uni.navigateTo({
        url: '/pages/camera/camera'
      });
    },
    
    // 清空收藏
    clearFavorites() {
      uni.showModal({
        title: '提示',
        content: '确定要清空所有收藏记录吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              this.loading = true;
              
              // 获取用户openid
              const openid = uni.getStorageSync('user_openid');
              if (!openid) {
                uni.showToast({
                  title: '请先登录',
                  icon: 'none'
                });
                this.loading = false;
                return;
              }
              
              // 调用云函数清空收藏
              const result = await uniCloud.callFunction({
                name: 'toggleFavorite',
                data: {
                  action: 'clearAll',
                  openid: openid
                }
              });
              
              if (result.result && result.result.code === 0) {
                // 清空本地数据
                this.favoritesList = [];
                uni.showToast({
                  title: '已清空收藏',
                  icon: 'success'
                });
              } else {
                uni.showToast({
                  title: '操作失败',
                  icon: 'none'
                });
              }
            } catch (error) {
              console.error('清空收藏失败:', error);
              uni.showToast({
                title: '清空收藏失败',
                icon: 'none'
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
      item.image = '/static/images/placeholder.jpg';
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
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  font-size: 18px;
  font-weight: bold;
  padding-top: 44px; /* 为系统状态栏预留空间 */
  box-sizing: content-box; /* 确保高度不包含padding */
  
  .iconfont {
    font-size: 24px;
  }
}

.search-box {
  padding: 12px 16px;
  background-color: white;
  
  .search-input {
    height: 40px;
    background-color: #f5f5f5;
    border-radius: 20px;
    display: flex;
    align-items: center;
    padding: 0 16px;
    
    .iconfont {
      font-size: 18px;
      color: #999;
      margin-right: 8px;
    }
    
    input {
      flex: 1;
      height: 40px;
      font-size: 14px;
    }
    
    .placeholder {
      color: #999;
    }
  }
}

.content {
  flex: 1;
  padding: 8px 16px 0 16px;
  padding-bottom: 32px;
  box-sizing: border-box;
  width: 100%;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  
  .loading-indicator {
    width: 30px;
    height: 30px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #4CAF50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }
  
  .loading-text {
    font-size: 14px;
    color: #999;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
}

.favorites-list {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 16px;
}

.favorite-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  box-sizing: border-box;
  width: 100%;
  
  &:last-child {
    border-bottom: none;
  }
}

.favorite-img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  margin-right: 12px;
  background-color: #f0f0f0;
}

.favorite-info {
  flex: 1;
  margin-right: 16px;
  
  .favorite-name {
    font-size: 16px;
    color: #333;
    margin-bottom: 4px;
    display: block;
  }
  
  .favorite-date {
    font-size: 12px;
    color: #999;
  }
}

.favorite-score {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  
  image {
    width: 32px;
    height: 32px;
  }
  
  &.score-high {
    color: #4CAF50;
  }
  
  &.score-medium {
    color: #FFC107;
  }
  
  &.score-low {
    color: #F44336;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  
  .empty-image {
    width: 200px;
    height: 200px;
    margin-bottom: 20px;
  }
  
  .empty-text {
    font-size: 16px;
    color: #999;
    margin-bottom: 20px;
  }
  
  .scan-btn {
    width: 200px;
    height: 44px;
    background-color: #4CAF50;
    color: white;
    border-radius: 22px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:active {
      opacity: 0.8;
    }
  }
}
</style> 