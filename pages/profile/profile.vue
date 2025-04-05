<template>
  <view class="profile-container">
    <!-- 用户信息区域 -->
    <view class="user-info">
      <block v-if="!hasUserInfo">
        <image class="avatar" src="/static/images/default-avatar.png"></image>
        <button class="login-btn" @tap="getUserProfile">点击登录</button>
      </block>
      <block v-else>
        <image class="avatar" :src="userInfo.avatarUrl"></image>
        <text class="nickname">{{userInfo.nickName}}</text>
      </block>
    </view>

    <!-- 菜单列表 -->
    <view class="menu-list">
      <view class="menu-item" v-for="(item, index) in menuList" :key="index" @tap="navigateTo(item.url)">
        <text class="iconfont" :class="item.icon"></text>
        <text class="menu-text">{{item.text}}</text>
        <text class="iconfont icon-arrow-right"></text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      userInfo: null,
      hasUserInfo: false,
      canIUseGetUserProfile: false,
      menuList: [
        {
          icon: 'icon-settings',
          text: '设置',
          url: '/pages/settings/settings'
        },
        {
          icon: 'icon-about',
          text: '关于我们',
          url: '/pages/about/about'
        },
        {
          icon: 'icon-help',
          text: '帮助与反馈',
          url: '/pages/help/help'
        }
      ]
    }
  },
  onLoad() {
    if (uni.getUserProfile) {
      this.canIUseGetUserProfile = true
    }
  },
  methods: {
    getUserProfile() {
      uni.getUserProfile({
        desc: '用于完善会员资料',
        success: (res) => {
          this.userInfo = res.userInfo
          this.hasUserInfo = true
        }
      })
    },
    navigateTo(url) {
      uni.navigateTo({
        url: url
      })
    }
  }
}
</script>

<style>
.profile-container {
  min-height: 100vh;
  background-color: #f8f8f8;
}

.user-info {
  background-color: #ffffff;
  padding: 40rpx 30rpx;
  padding-top: calc(44px + 40rpx); /* 为系统状态栏预留空间 */
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  margin-bottom: 20rpx;
}

.nickname {
  font-size: 32rpx;
  color: #333333;
}

.login-btn {
  background: none;
  border: none;
  color: #4CAF50;
  font-size: 32rpx;
  padding: 0;
  line-height: 1.5;
}

.login-btn::after {
  border: none;
}

.menu-list {
  background-color: #ffffff;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item .iconfont {
  font-size: 40rpx;
  color: #666666;
  margin-right: 20rpx;
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333333;
}

.icon-arrow-right {
  color: #999999;
  font-size: 32rpx;
}
</style> 