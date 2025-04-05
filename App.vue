<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 获取用户openid
			uni.login({
				provider: 'weixin',
				success: (loginRes) => {
					console.log('======1===');
					console.log(loginRes.code);
					// 调用云函数获取openid
					uniCloud.callFunction({
						name: 'getOpenId',
						data: {
							code: loginRes.code
						},
						success: (res) => {
							console.log('======2===');
							console.log(res);
							if (res.result) {
								// 将openid存储到本地
								uni.setStorageSync('user_openid', res.result);
								console.log('openid已保存：', res.result);
							} else {
								console.error('获取openid失败：返回数据格式错误');
							}
						},
						fail: (err) => {
							console.error('获取openid失败：', err);
						}
					});
				},
				fail: (err) => {
					console.error('登录失败：', err);
				}
			});
		},
		onShow: function() {
			console.log('App Show');
		},
		onHide: function() {
			console.log('App Hide');
		}
	};
</script>

<style>
	/*每个页面公共css */
	@font-face {
		font-family: "iconfont";
		src: url('/static/fonts/iconfont.woff2') format('woff2'),
			 url('/static/fonts/iconfont.woff') format('woff'),
			 url('/static/fonts/iconfont.ttf') format('truetype');
	}
	
	.iconfont {
		font-family: "iconfont" !important;
		font-size: 16px;
		font-style: normal;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}
	
	.icon-star:before {
		content: "\e870";
	}
	
	.icon-delete:before {
		content: "\e6a4";
	}
	
	.icon-back:before {
 		content: "\e662";
	}
	
	.icon-share:before {
		content: "\e6a6";
	}
	
	.icon-sousuo:before {
		content: "\e8ed";
	}
</style>
