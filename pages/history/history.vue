<template>
  <view class="container">
    <!-- 头部 -->
    <view class="header">
      <view class="back-btn" @tap="goBack">
        <text class="iconfont icon-back"></text>
      </view>
      <text class="title">所有记录</text>
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
          @input="handleSearch"
        />
      </view>
      
      <!-- 历史记录 -->
      <view class="card">
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
            v-for="(item, index) in filteredHistoryList" 
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
      
      <!-- 加载更多 -->
      <view class="load-more" v-if="historyList.length > 0 && hasMore" @tap="loadMoreData">
        <text>加载更多</text>
      </view>
      
      <!-- 加载完毕提示 -->
      <view class="no-more" v-if="historyList.length > 0 && !hasMore">
        <text>已加载全部记录</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      searchText: '',
      historyList: [],
      loading: false,
      page: 1,
      pageSize: 20,
      hasMore: true
    }
  },
  computed: {
    filteredHistoryList() {
      if (!this.searchText) {
        return this.historyList;
      }
      
      const keyword = this.searchText.toLowerCase();
      return this.historyList.filter(item => {
        return (
          (item.name && item.name.toLowerCase().includes(keyword)) || 
          (item.productName && item.productName.toLowerCase().includes(keyword)) ||
          (item.brandName && item.brandName.toLowerCase().includes(keyword))
        );
      });
    }
  },
  onLoad() {
    // 页面加载时获取数据
    this.loadHistoryData();
  },
  onReachBottom() {
    // 滚动到底部时，如果还有更多记录，则加载更多
    if (this.hasMore && !this.loading) {
      this.loadMoreData();
    }
  },
  onPullDownRefresh() {
    // 下拉刷新时，重新加载数据
    this.page = 1;
    this.historyList = [];
    this.hasMore = true;
    this.loadHistoryData().then(() => {
      uni.stopPullDownRefresh();
    });
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
          productIngredientID: true,
          productImageID: true,
          productName: true,
          brandName: true,
          productType: true,
          openid: true,
          createdAt: true,
          'analysis.score': true, 
          'analysis.scoreTitle': true,
          'analysis.scoreDesc': true,
          'analysis.nutritionDesc': true,
          'analysis.suitablePeople': true,
          'analysis.alternativeDesc': true,
          'analysis.ingredients': true // 获取配料详情，以便点击时直接使用
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
        
        // 设置分页
        const skip = (this.page - 1) * this.pageSize;
        const result = await query.skip(skip).limit(this.pageSize).get();
        
        // 检查是否有数据返回
        if (result && result.result && result.result.data && result.result.data.length > 0) {
          console.log(`====== 第${this.page}页数据，共${result.result.data.length}条 ======`);
          
          // 处理获取到的记录
          const newRecords = result.result.data.map(item => {
            // 格式化日期
            const date = new Date(item.createdAt);
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            // 优先使用商品名称，如果没有则使用分析结果中的评分标题
            const productName = item.productName || item.analysis?.scoreTitle || '未知产品';
            
            return {
              id: item._id,
              productIngredientID: item.productIngredientID,
              productImageID: item.productImageID,
              productName: item.productName || '',
              brandName: item.brandName || '',
              productType: item.productType || '',
              name: productName,
              image: item.productImageID || item.productIngredientID || '/static/images/placeholder.jpg', // 优先使用商品图片
              date: formattedDate,
              isFavorite: false, // 默认未收藏，后续可通过收藏表查询更新
              analysis: item.analysis
            };
          });
          
          // 添加到现有列表
          if (this.page === 1) {
            this.historyList = newRecords;
          } else {
            this.historyList = [...this.historyList, ...newRecords];
          }
          
          // 检查是否还有更多数据
          this.hasMore = result.result.data.length === this.pageSize;
          
          // 检查收藏状态
          this.checkFavoriteStatus();
        } else {
          if (this.page === 1) {
            console.warn('======没有查询到数据或数据格式不正确======');
            this.historyList = []; // 确保没有数据时设置为空数组
          }
          
          this.hasMore = false;
        }
      } catch (error) {
        console.error('获取历史记录失败:', error);
        uni.showToast({
          title: '获取历史记录失败',
          icon: 'none'
        });
        
        if (this.page === 1) {
          this.historyList = []; // 确保错误时设置为空数组
        }
        
        this.hasMore = false;
      } finally {
        this.loading = false;
      }
    },
    
    // 加载更多数据
    loadMoreData() {
      if (this.loading || !this.hasMore) return;
      
      this.page += 1;
      this.loadHistoryData();
    },
    
    // 处理搜索输入
    handleSearch() {
      // 搜索功能通过computed属性实现
    },
    
    // 检查收藏状态
    checkFavoriteStatus() {
      try {
        const favorites = uni.getStorageSync('favorites') || [];
        
        // 更新收藏状态
        this.historyList.forEach(item => {
          const isFavorite = favorites.some(fav => 
            fav.imageId === item.productImageID || fav.imageId === item.productIngredientID || 
            (fav.scoreTitle === item.analysis?.scoreTitle && item.analysis?.scoreTitle !== '')
          );
          item.isFavorite = isFavorite;
        });
      } catch (error) {
        console.error('检查收藏状态失败:', error);
      }
    },
    
    // 返回上一页
    goBack() {
      uni.navigateBack();
    },
    
    async goToResult(item) {
      try {
        // 先显示加载提示
        uni.showLoading({
          title: '加载数据中...'
        });
        
        // 如果没有配料信息，需要先获取完整记录
        let completeAnalysis = item.analysis;
        
        // 如果分析结果中没有配料信息或配料数组为空，先查询完整记录
        if (!completeAnalysis?.ingredients || completeAnalysis.ingredients.length === 0) {
          try {
            const db = uniCloud.database();
            const { result } = await db.collection('ingredient_analyses')
              .doc(item.id)
              .get();
              
            if (result && result.data && result.data.length > 0) {
              completeAnalysis = result.data[0].analysis || {};
              console.log('获取完整分析记录成功');
            }
          } catch (dbError) {
            console.error('获取完整分析记录失败:', dbError);
            // 失败继续使用原有数据
          }
        }
        
        // 准备传递给result页面的完整数据
        const completeData = {
          analysis: completeAnalysis,
          imageId: item.productImageID || item.productIngredientID, // 优先使用商品图片ID
          productIngredientID: item.productIngredientID,
          productImageID: item.productImageID,
          productName: item.productName || '',
          brandName: item.brandName || '',
          productType: item.productType || '',
          analysisId: item.id, // 数据库记录ID
          isFavorite: item.isFavorite
        };
        
        // 如果有配料信息，查询详细数据并填充
        if (completeData.analysis && completeData.analysis.ingredients && completeData.analysis.ingredients.length > 0) {
          try {
            const db = uniCloud.database();
            
            // 提取所有配料名称
            const ingredientNames = completeData.analysis.ingredients.map(ing => ing.name);
            
            // 查询配料详细信息
            const { result } = await db.collection('ingredients')
              .where({
                name: db.command.in(ingredientNames)
              })
              .get();
            
            // 如果查询到数据
            if (result && result.data && result.data.length > 0) {
              console.log('查询到配料详细信息:', result.data.length);
              
              // 创建配料名称到详细信息的映射
              const ingredientMap = {};
              result.data.forEach(ing => {
                ingredientMap[ing.name] = ing;
              });
              
              // 标记是否有危险成分
              let hasDangerousIngredient = false;
              
              // 更新配料数组中的每个配料信息
              completeData.analysis.ingredients = completeData.analysis.ingredients.map(ing => {
                // 如果在ingredients表中找到了对应的配料信息
                if (ingredientMap[ing.name]) {
                  const detailedInfo = ingredientMap[ing.name];
                  
                  // 检查是否是危险成分
                  if (detailedInfo.safety_status === '危险' || ing.riskLevel === 'high') {
                    hasDangerousIngredient = true;
                  }
                  
                  // 返回填充了详细信息的配料对象
                  return {
                    name: ing.name,
                    riskLevel: (detailedInfo.safety_status === '危险' ? 'high' : 
                               detailedInfo.safety_status === '安全' ? 'low' : 'medium'),
                    category: detailedInfo.category || ing.category || '',
                    usage: detailedInfo.functions || ing.usage || '',
                    risks: Array.isArray(detailedInfo.regulations) && detailedInfo.regulations.length ? 
                           detailedInfo.regulations.join('; ') : (ing.risks || '')
                  };
                }
                
                // 如果没有找到详细信息但标记为高风险
                if (ing.riskLevel === 'high') {
                  hasDangerousIngredient = true;
                }
                
                // 如果没找到对应的详细信息，保持原样
                return ing;
              });
              
              // 根据是否有危险成分设置分数
              if (hasDangerousIngredient) {
                completeData.analysis.score = 0;
              } else {
                completeData.analysis.score = 100;
              }
              
              console.log('配料信息填充完成，安全分数已更新为:', completeData.analysis.score);
            } else {
              console.log('未查询到配料详细信息');
            }
          } catch (error) {
            console.error('查询配料详细信息失败:', error);
            // 查询失败不影响页面跳转，使用原有数据
          }
        }
        
        // 缓存完整数据
        uni.setStorageSync('completeAnalysisData', completeData);
        
        // 隐藏加载提示
        uni.hideLoading();
        
        // 跳转到result页面
        uni.navigateTo({
          url: `/pages/result/result?from=history`
        });
      } catch (error) {
        console.error('准备结果数据失败:', error);
        uni.hideLoading();
        uni.showToast({
          title: '加载数据失败',
          icon: 'none'
        });
      }
    },
    
    toggleFavorite(item) {
      try {
        let favorites = uni.getStorageSync('favorites') || [];
        
        // 查找是否已收藏
        const index = favorites.findIndex(fav => 
          fav.imageId === item.productImageID || fav.imageId === item.productIngredientID || 
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
            imageId: item.productImageID || item.productIngredientID,
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
  padding-top: 44px; /* 为系统状态栏预留空间 */
  box-sizing: content-box; /* 确保高度不包含padding */
  
  .back-btn {
    display: flex;
    align-items: center;
    margin-right: 16px;
    padding: 8px;
    
    .iconfont {
      font-size: 24px;
      color: white;
    }
  }
  
  .title {
    flex: 1;
    text-align: center;
  }
}

.content {
  flex: 1;
  padding: 16px;
  padding-bottom: 32px;
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

.load-more {
  display: flex;
  justify-content: center;
  padding: 16px;
  font-size: 14px;
  color: #4CAF50;
}

.no-more {
  display: flex;
  justify-content: center;
  padding: 16px;
  font-size: 12px;
  color: #999;
}
</style> 