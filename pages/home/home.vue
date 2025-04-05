<template>
  <view class="container">    
    <!-- 头部 -->
    <view class="header">
      <text class="title">安心食</text>
      <text class="iconfont icon-notification"></text>
    </view>
    
    <!-- 内容区 -->
    <view class="content">
      <!-- 搜索栏 -->
      <view class="search-bar">
        <text class="iconfont icon-search"></text>
        <input 
          type="text" 
          class="search-input" 
          placeholder="搜索食品或配料"
          v-model="searchText"
        />
      </view>
      
      <!-- 历史记录 -->
      <view class="card">
        <view class="card-title">最近扫描</view>
        
        <!-- 加载状态 -->
        <view class="loading-container" v-if="loading">
          <view class="loading-spinner"></view>
          <text class="loading-text">加载中...</text>
        </view>
        
        <!-- 空状态提示 -->
        <view class="empty-state" v-else-if="historyList.length === 0">
          <image src="/static/images/empty.svg" mode="aspectFit" class="empty-image"></image>
          <text class="empty-text">暂无分析记录</text>
          <text class="empty-subtext">拍摄食品配料表，了解食品安全</text>
        </view>
        
        <!-- 历史记录列表 -->
        <view class="history-list" v-else>
          <view 
            class="history-item" 
            v-for="(item, index) in historyList" 
            :key="index"
            @tap="goToResult(item)"
          >
            <image :src="item.image" class="history-img" mode="aspectFill" @error="setDefaultImage(item)"></image>
            <view class="history-info">
              <text class="history-title">{{item.name || '未知产品'}}</text>
              <text class="history-date">{{item.date}}</text>
            </view>
            <view class="history-actions">
              <text 
                class="iconfont icon-favorite" 
                :class="{'active': item.isFavorite}"
                @tap.stop="toggleFavorite(item)"
              ></text>
              <text class="iconfont icon-delete" @tap.stop="deleteHistory(item)"></text>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 扫描按钮 -->
    <view class="camera-btn" @tap="goToCamera">
      <image src="/static/images/camera.svg" mode="aspectFit" class="camera-icon"></image>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      searchText: '',
      historyList: [],
      loading: false
    }
  },
  onLoad() {
    // 页面加载时获取数据
    this.loadHistoryData();
  },
  onShow() {
    // 每次页面显示时刷新数据
    this.loadHistoryData();
  },
  methods: {
    // 加载历史分析数据
    async loadHistoryData() {
      try {
        this.loading = true;
        
        // 获取用户openid
        const openid = uni.getStorageSync('user_openid');
        if (!openid) {
          console.warn('未找到用户openid，将显示所有记录');
        }
        
        // 调用云函数获取数据库中的记录
        const db = uniCloud.database();
        
        // 构建字段选择器，排除ingredients字段以减少数据量
        const field = {
          fileID: true,
          openid: true,
          createdAt: true,
          'analysis.score': true, 
          'analysis.scoreTitle': true,
          'analysis.scoreDesc': true,
          'analysis.nutritionDesc': true,
          'analysis.suitablePeople': true,
          'analysis.alternativeDesc': true,
          'analysis.ingredients': true
          // 不能使用黑名单模式(false)排除字段
        };
        
        // 构建查询条件：如果有openid则按用户过滤，否则显示所有
        let query;
        if (openid) {
          // 按用户openid过滤记录
          query = db.collection('ingredient_analyses')
            .where({ openid: openid })
            .field(field)
            .orderBy('createdAt', 'desc');
        } else {
          // 不过滤用户，显示所有记录
          query = db.collection('ingredient_analyses')
            .field(field)
            .orderBy('createdAt', 'desc');
        }
        
        // 按时间倒序排列，获取最新的记录
        const result = await query.limit(10).get();
        
        // 检查是否有数据返回
        if (result && result.result && result.result.data && result.result.data.length > 0) {
          console.log('======第一条数据======', result.result.data[0]);
          
          // 转换数据格式
          this.historyList = result.result.data.map(item => {
            // 格式化日期
            const date = new Date(item.createdAt);
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            // 从分析结果中获取产品名称 - 确保结果正确
            const productName = item.analysis?.scoreTitle || '未知产品';
            
            return {
              id: item._id,
              fileID: item.fileID,
              name: productName,
              image: item.fileID || '/static/images/placeholder.jpg', // 使用fileID作为图片路径
              date: formattedDate,
              isFavorite: false, // 默认未收藏，后续可通过收藏表查询更新
              analysis: item.analysis
            };
          });
          
          console.log('======转换后的historyList长度======', this.historyList.length);
          
          // 检查收藏状态
          this.checkFavoriteStatus();
        } else {
          console.warn('======没有查询到数据或数据格式不正确======');
          this.historyList = []; // 确保没有数据时设置为空数组
        }
      } catch (error) {
        console.error('获取历史记录失败:', error);
        uni.showToast({
          title: '获取历史记录失败',
          icon: 'none'
        });
        this.historyList = []; // 确保错误时设置为空数组
      } finally {
        this.loading = false;
      }
    },
    
    // 检查收藏状态
    checkFavoriteStatus() {
      try {
        const favorites = uni.getStorageSync('favorites') || [];
        
        // 更新收藏状态
        this.historyList.forEach(item => {
          const isFavorite = favorites.some(fav => 
            fav.imageId === item.fileID || 
            (fav.scoreTitle === item.analysis?.scoreTitle && item.analysis?.scoreTitle !== '')
          );
          item.isFavorite = isFavorite;
        });
      } catch (error) {
        console.error('检查收藏状态失败:', error);
      }
    },
    
    goToCamera() {
      uni.navigateTo({
        url: '/pages/camera/camera'
      })
    },
    
    goToResult(item) {
      // 准备传递给result页面的完整数据
      const completeData = {
        analysis: item.analysis,
        imageId: item.fileID,
        analysisId: item.id, // 数据库记录ID
        isFavorite: item.isFavorite
      };
      
      // 缓存完整数据
      uni.setStorageSync('completeAnalysisData', completeData);
      
      // 跳转到result页面
      uni.navigateTo({
        url: `/pages/result/result?from=home`
      });
    },
    
    toggleFavorite(item) {
      try {
        let favorites = uni.getStorageSync('favorites') || [];
        
        // 查找是否已收藏
        const index = favorites.findIndex(fav => 
          fav.imageId === item.fileID || 
          (fav.scoreTitle === item.analysis?.scoreTitle && item.analysis?.scoreTitle !== '')
        );
        
        if (index > -1) {
          // 已收藏，移除
          favorites.splice(index, 1);
          item.isFavorite = false;
          uni.showToast({
            title: '已取消收藏',
            icon: 'none'
          });
        } else {
          // 未收藏，添加
          const favoriteItem = {
            imageId: item.fileID,
            scoreTitle: item.analysis?.scoreTitle || '',
            score: item.analysis?.score || 0,
            timestamp: new Date().getTime()
          };
          
          favorites.push(favoriteItem);
          item.isFavorite = true;
          uni.showToast({
            title: '已添加到收藏',
            icon: 'none'
          });
        }
        
        // 保存更新后的收藏列表
        uni.setStorageSync('favorites', favorites);
      } catch (e) {
        console.error('更新收藏失败:', e);
        uni.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    },
    
    async deleteHistory(item) {
      uni.showModal({
        title: '提示',
        content: '确定要删除这条记录吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              // 调用云函数删除记录
              const db = uniCloud.database();
              await db.collection('ingredient_analyses').doc(item.id).remove();
              
              // 本地列表也删除
              const index = this.historyList.findIndex(i => i.id === item.id);
              if (index > -1) {
                this.historyList.splice(index, 1);
              }
              
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } catch (error) {
              console.error('删除记录失败:', error);
              uni.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },
    
    setDefaultImage(item) {
      item.image = '/static/images/placeholder.jpg';
    },
    
    getScoreClass(score) {
      if (score >= 80) {
        return 'high-score';
      } else if (score >= 60) {
        return 'medium-score';
      } else {
        return 'low-score';
      }
    }
  }
}
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
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
}

.content {
  flex: 1;
  padding: 16px;
}

.search-bar {
  background-color: #f0f0f0;
  border-radius: 20px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  height: 40px;
  margin-bottom: 16px;
  
  .iconfont {
    color: #999;
    margin-right: 10px;
  }
  
  .search-input {
    flex: 1;
    height: 100%;
    color: #333;
    font-size: 14px;
    background: transparent;
    border: none;
  }
}

.card {
  background-color: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #333;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #4CAF50;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-left: 10px;
  font-size: 14px;
  color: #333;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 16px;
}

.empty-image {
  width: 100px;
  height: 100px;
  margin-bottom: 10px;
}

.empty-text {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.empty-subtext {
  font-size: 12px;
  color: #999;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.history-img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
}

.history-info {
  flex: 1;
  margin-left: 10px;
  display: flex;
  flex-direction: column;
}

.history-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.history-date {
  font-size: 12px;
  color: #999;
}

.history-score {
  display: flex;
  align-items: center;
  margin-top: 4px;
}

.score-label {
  font-size: 12px;
  color: #999;
}

.score-value {
  font-size: 16px;
  font-weight: bold;
  margin-left: 4px;
}

.high-score {
  color: #4CAF50;
}

.medium-score {
  color: #FFC107;
}

.low-score {
  color: #F44336;
}

.history-actions {
  display: flex;
  align-items: center;
  
  .iconfont {
    margin-left: 10px;
    color: #999;
    font-size: 18px;
    
    &.active {
      color: #FFD700;
    }
  }
}

.camera-btn {
  width: 100px;
  height: 100px;
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  transition: all 0.3s ease;
  
  &:active {
    transform: translateX(-50%) scale(0.95);
  }
  
  .camera-icon {
    width: 100%;
    height: 100%;
  }
}
</style> 