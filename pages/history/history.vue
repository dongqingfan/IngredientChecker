<template>
  <view class="container">
    <!-- 头部 -->
    <view class="header">
      <text class="title">历史记录</text>
      <text class="iconfont icon-delete" @tap="clearHistory"></text>
    </view>
    
    <!-- 内容区 -->
    <scroll-view class="content" scroll-y>
      <!-- 日期分组 -->
      <view 
        class="date-group"
        v-for="(group, date) in groupedHistory"
        :key="date"
      >
        <view class="date-header">{{date}}</view>
        
        <!-- 历史记录列表 -->
        <view class="history-list">
          <view 
            class="history-item"
            v-for="(item, index) in group"
            :key="index"
            @tap="goToResult(item)"
          >
            <image :src="item.image" mode="aspectFill" class="history-img"></image>
            <view class="history-info">
              <text class="history-title">{{item.name}}</text>
              <text class="history-time">{{item.time}}</text>
            </view>
            <view class="history-score" :class="getScoreClass(item.score)">
              {{item.score}}分
            </view>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="historyList.length === 0">
        <image src="/static/images/empty-history.png" mode="aspectFit" class="empty-image"></image>
        <text class="empty-text">暂无扫描记录</text>
        <button class="scan-btn" @tap="goToCamera">立即扫描</button>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      historyList: [
        {
          id: 1,
          name: '某品牌薯片',
          image: '/static/images/sample1.jpg',
          time: '10:30',
          score: 85
        },
        {
          id: 2,
          name: '某品牌饮料',
          image: '/static/images/sample2.jpg',
          time: '09:15',
          score: 92
        }
      ]
    }
  },
  computed: {
    groupedHistory() {
      const groups = {}
      this.historyList.forEach(item => {
        const date = '今天' // TODO: 根据实际日期分组
        if (!groups[date]) {
          groups[date] = []
        }
        groups[date].push(item)
      })
      return groups
    }
  },
  methods: {
    getScoreClass(score) {
      if (score >= 90) return 'score-high'
      if (score >= 70) return 'score-medium'
      return 'score-low'
    },
    goToResult(item) {
      uni.navigateTo({
        url: `/pages/result/result?id=${item.id}`
      })
    },
    goToCamera() {
      uni.navigateTo({
        url: '/pages/camera/camera'
      })
    },
    clearHistory() {
      uni.showModal({
        title: '提示',
        content: '确定要清空所有历史记录吗？',
        success: (res) => {
          if (res.confirm) {
            this.historyList = []
            // TODO: 调用后端API清空历史记录
          }
        }
      })
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
  
  .iconfont {
    font-size: 24px;
  }
}

.content {
  flex: 1;
  padding: 16px;
}

.date-group {
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.date-header {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
  padding-left: 4px;
}

.history-list {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.history-img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  margin-right: 12px;
}

.history-info {
  flex: 1;
  
  .history-title {
    font-size: 16px;
    color: #333;
    margin-bottom: 4px;
    display: block;
  }
  
  .history-time {
    font-size: 12px;
    color: #999;
  }
}

.history-score {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
  
  &.score-high {
    background-color: #4CAF50;
  }
  
  &.score-medium {
    background-color: #FFC107;
  }
  
  &.score-low {
    background-color: #F44336;
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