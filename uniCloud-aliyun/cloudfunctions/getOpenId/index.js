'use strict';

exports.main = async (event, context) => {
  let appid = "wx3e7ade1f559d7aa6"; // 你的AppID
  let secret = "beb3079e1adec82ea866b3193ce8b132"; // 你的AppSecret
  let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${event.code}&grant_type=authorization_code`;
  console.log(url);
  try {
    let res = await uniCloud.httpclient.request(
      url,
      {
        dataType: "json"
      }
    );
    
    console.log('微信接口返回：', res.data);
    
    if (res.data.openid) {
      return res.data.openid;
    } else {
      throw new Error('获取openid失败：' + JSON.stringify(res.data));
    }
  } catch (error) {
    console.error('请求失败：', error);
    throw error;
  }
} 