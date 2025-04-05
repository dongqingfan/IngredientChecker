<template>
  <view class="container">
    <swiper 
      class="swiper" 
      :indicator-dots="false" 
      :autoplay="true" 
      :interval="3000" 
      :duration="500"
      @change="handleSwiperChange"
    >
      <swiper-item v-for="(item, index) in onboardingList" :key="index">
        <image :src="item.image" mode="aspectFit" class="onboarding-image"></image>
        <view class="onboarding-content">
          <text class="title">{{item.title}}</text>
          <text class="description">{{item.description}}</text>
        </view>
      </swiper-item>
    </swiper>
    
    <view class="bottom-section">
      <view class="dots">
        <view 
          v-for="(item, index) in onboardingList" 
          :key="index"
          class="dot"
          :class="{'active': currentIndex === index}"
        ></view>
      </view>
      
      <button 
        class="start-btn" 
        @tap="goToHome"
      >开始使用</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      currentIndex: 0,
      onboardingList: [
        {
          image: '/static/images/onboarding1.svg',
          title: '安心食',
          description: '智能识别食品成分，让您吃得放心'
        },
        {
          image: '/static/images/onboarding2.svg',
          title: '快速扫描',
          description: '对准食品包装，一键识别成分'
        },
        {
          image: '/static/images/onboarding3.svg',
          title: '安全评估',
          description: '专业分析成分安全性，给出建议'
        }
      ]
    }
  },
  methods: {
    handleSwiperChange(e) {
      this.currentIndex = e.detail.current
    },
    goToHome() {
      uni.switchTab({
        url: '/pages/home/home'
      })
    }
  }
}
</script>

<style lang="scss">
.container {
  height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
}

.swiper {
  flex: 1;
  width: 100%;
}

.onboarding-image {
  width: 100%;
  height: 60%;
  margin-top: 10%;
}

.onboarding-content {
  padding: 20px;
  text-align: center;
  
  .title {
    font-size: 24px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
    display: block;
  }
  
  .description {
    font-size: 16px;
    color: #666;
    line-height: 1.5;
  }
}

.bottom-section {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dots {
  display: flex;
  margin-bottom: 20px;
  
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background-color: #ddd;
    margin: 0 4px;
    
    &.active {
      background-color: #4CAF50;
      width: 20px;
    }
  }
}

.start-btn {
  width: 80%;
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
</style> 