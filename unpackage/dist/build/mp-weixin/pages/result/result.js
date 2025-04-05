"use strict";const e=require("../../common/vendor.js"),i=require("../../common/assets.js"),o={data:()=>({isFavorite:!1,imageId:"",analysisId:"",foodInfo:{name:"加载中...",score:0,scoreTitle:"分析中...",scoreDesc:"正在分析食品安全性...",nutritionDesc:"正在分析营养信息...",suitablePeople:"正在分析适宜人群...",alternativeDesc:"正在分析替代建议...",ingredients:[]},analysisData:{},_checkedFavoriteInLoad:!1}),onLoad(i){console.log("==result==",i);const o=e.index.getStorageSync("completeAnalysisData");if(o)console.log("从缓存获取到完整数据:",o),this.imageId=o.imageId||"",this.analysisId=o.analysisId||"",void 0!==o.isFavorite&&(this.isFavorite=o.isFavorite),o.analysis&&this.processAnalysisData(o.analysis),o.error&&e.index.showToast({title:o.errorMsg||"分析失败",icon:"none",duration:2e3}),e.index.removeStorageSync("completeAnalysisData");else if(i.imageId){this.imageId=i.imageId,i.analysisId&&(this.analysisId=i.analysisId);const o=e.index.getStorageSync("ingredientAnalysis");o?(this.processAnalysisData(o),e.index.removeStorageSync("ingredientAnalysis")):this.imageId&&this.getAnalysisFromCloud(this.imageId)}else e.index.showToast({title:"未找到分析数据",icon:"none"});this.analysisId&&!1===this.isFavorite&&(this.checkIfFavoriteFromCloud(),this._checkedFavoriteInLoad=!0)},onShow(){this.analysisId&&!this._checkedFavoriteInLoad&&this.checkIfFavoriteFromCloud()},methods:{processAnalysisData(i){try{if("string"==typeof i)try{i=JSON.parse(i)}catch(o){console.error("JSON解析错误:",o);const e=i.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g,'"$2":').replace(/'/g,'"');i=JSON.parse(e)}this.foodInfo.name=i.scoreTitle||"未知产品",this.foodInfo.score=i.score||0,this.foodInfo.scoreTitle=i.scoreTitle||"",this.foodInfo.scoreDesc=i.scoreDesc||"",i.ingredients&&Array.isArray(i.ingredients)&&(this.foodInfo.ingredients=i.ingredients.map((e=>({name:e.name||"",description:e.description||"",riskLevel:e.riskLevel||"low",category:e.category||"",usage:e.usage||"",risks:e.risks||""})))),this.foodInfo.nutritionDesc=i.nutritionDesc||"",this.foodInfo.suitablePeople=i.suitablePeople||"";let e=this.foodInfo.suitablePeople;e.includes("适宜人群：")&&(e=e.replace(/适宜人群：/g,"适宜人群：\n")),e.includes("不适宜人群：")&&(e=e.replace(/不适宜人群：/g,"\n不适宜人群：\n")),e.includes("。")&&(e=e.replace(/。(?!$)/g,"。\n")),this.foodInfo.suitablePeople=e,this.analysisData={score:i.score,scoreTitle:i.scoreTitle,timestamp:(new Date).getTime(),imageId:this.imageId},this.checkIfFavoriteFromCloud(),console.log("分析数据处理完成:",this.foodInfo)}catch(s){console.error("处理分析数据失败:",s),e.index.showToast({title:"数据处理失败",icon:"none"})}},getAnalysisFromCloud(i){e.index.showLoading({title:"获取分析结果..."}),e.nr.callFunction({name:"imgUploadAndAnalyze",data:{fileID:i},success:i=>{i.result&&0===i.result.code?(this.processAnalysisData(i.result.data),i.result.analysis_id&&(this.analysisId=i.result.analysis_id,this.checkIfFavoriteFromCloud())):e.index.showToast({title:"获取分析失败",icon:"none"})},fail:i=>{console.error("获取分析失败:",i),e.index.showToast({title:"获取分析失败",icon:"none"})},complete:()=>{e.index.hideLoading()}})},goBack(){const i=getCurrentPages(),o=i.find((e=>{const i=e.route||e.__route__;return i&&(i.includes("/home/")||i.includes("/favorites/"))}));if(o){const s=i.length-i.indexOf(o)-1;e.index.navigateBack({delta:s>0?s:1})}else e.index.switchTab({url:"/pages/home/home"})},toggleFavorite(){try{if(!this.analysisId){console.log("分析ID不存在，尝试先保存记录"),e.index.showLoading({title:"处理中..."});const i=e.index.getStorageSync("user_openid");return i?void e.nr.callFunction({name:"imgUploadAndAnalyze",data:{fileID:this.imageId,openid:i,saveOnly:!0,analysis:this.foodInfo},success:i=>{i.result&&0===i.result.code&&i.result.analysis_id?(this.analysisId=i.result.analysis_id,console.log("成功获取并设置分析ID:",this.analysisId),this.doToggleFavorite()):(e.index.hideLoading(),e.index.showToast({title:"无法获取分析ID",icon:"none"}))},fail:i=>{e.index.hideLoading(),console.error("保存分析记录失败:",i),e.index.showToast({title:"操作失败",icon:"none"})}}):(e.index.hideLoading(),void e.index.showToast({title:"请先登录",icon:"none"}))}this.doToggleFavorite()}catch(i){e.index.hideLoading(),console.error("更新收藏失败:",i),e.index.showToast({title:"操作失败",icon:"none"})}},doToggleFavorite(){e.index.showLoading({title:this.isFavorite?"取消收藏中...":"收藏中..."});const i=e.index.getStorageSync("user_openid");if(!i)return e.index.hideLoading(),void e.index.showToast({title:"请先登录",icon:"none"});const o={openid:i,analysis_id:this.analysisId};console.log("收藏数据:",o),e.nr.callFunction({name:"toggleFavorite",data:{action:this.isFavorite?"remove":"add",favoriteData:o},success:i=>{var o;e.index.hideLoading(),i.result&&0===i.result.code?(this.isFavorite=!this.isFavorite,e.index.showToast({title:this.isFavorite?"已添加到收藏":"已取消收藏",icon:"success"})):(console.error("收藏操作失败:",i.result),e.index.showToast({title:(null==(o=i.result)?void 0:o.message)||"操作失败",icon:"none"}))},fail:i=>{e.index.hideLoading(),console.error("收藏操作失败:",i),e.index.showToast({title:"网络错误，请稍后再试",icon:"none"})}})},goToHome(){e.index.switchTab({url:"/pages/home/home"})},goToFavorites(){e.index.switchTab({url:"/pages/favorites/favorites"})},goToProfile(){e.index.switchTab({url:"/pages/profile/profile"})},checkIfFavoriteFromCloud(){const i=e.index.getStorageSync("user_openid");i&&this.analysisId?e.nr.callFunction({name:"toggleFavorite",data:{action:"check",favoriteData:{openid:i,analysis_id:this.analysisId}},success:e=>{e.result&&0===e.result.code&&(this.isFavorite=e.result.isFavorite)},fail:()=>{this.isFavorite=!1}}):this.isFavorite=!1}}};const s=e._export_sfc(o,[["render",function(o,s,t,n,a,r){return{a:e.o(((...e)=>r.goBack&&r.goBack(...e))),b:e.t(a.foodInfo.name),c:e.t(a.isFavorite?"已收藏":"收藏"),d:e.o(((...e)=>r.toggleFavorite&&r.toggleFavorite(...e))),e:a.isFavorite?1:"",f:i._imports_0$1,g:e.t(a.foodInfo.scoreTitle),h:e.t(a.foodInfo.scoreDesc),i:e.f(a.foodInfo.ingredients,((i,o,s)=>({a:e.t(i.name),b:e.t(i.description),c:e.t("high"===i.riskLevel?"风险":"medium"===i.riskLevel?"谨慎":"安全"),d:e.n(i.riskLevel),e:o}))),j:e.t(a.foodInfo.nutritionDesc),k:e.t(a.foodInfo.suitablePeople),l:e.t(a.foodInfo.alternativeDesc)}}]]);wx.createPage(s);
