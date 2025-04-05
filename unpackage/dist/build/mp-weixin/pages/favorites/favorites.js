"use strict";const e=require("../../common/vendor.js"),t=require("../../common/assets.js"),a={data:()=>({searchText:"",loading:!1,favoritesList:[],hasMore:!0,page:1,pageSize:10}),computed:{filteredFavorites(){if(!this.searchText)return this.favoritesList;const e=this.searchText.toLowerCase();return this.favoritesList.filter((t=>t.name&&t.name.toLowerCase().includes(e)))}},onLoad(){this.loadFavorites()},onShow(){this.refreshFavorites()},onPullDownRefresh(){this.refreshFavorites()},methods:{async loadFavorites(){if(!this.loading&&this.hasMore){this.loading=!0;try{const t=e.index.getStorageSync("user_openid");if(!t)return e.index.showToast({title:"请先登录",icon:"none"}),void(this.loading=!1);const a=e.nr.database(),s=a.command,i=await a.collection("user_favorites").where({openid:t}).orderBy("createdAt","desc").skip((this.page-1)*this.pageSize).limit(this.pageSize).get();if(console.log("获取收藏记录成功，完整数据结构:",JSON.stringify(i)),!i.result||!i.result.data||0===i.result.data.length)return console.warn("用户没有收藏记录"),this.favoritesList=[],this.hasMore=!1,void(this.loading=!1);const o=i.result.data.map((e=>e.analysis_id));if(console.log("分析ID列表:",o),!o.length)return console.warn("没有有效的分析记录ID"),this.favoritesList=[],this.hasMore=!1,void(this.loading=!1);const n=await a.collection("ingredient_analyses").where({_id:s.in(o)}).get();console.log("获取分析记录成功，完整数据结构:",JSON.stringify(n));const r={};n.result&&n.result.data?n.result.data.forEach((e=>{r[e._id]=e})):console.warn("没有找到匹配的分析记录");const l=i.result.data.map((e=>{var t,a;const s=r[e.analysis_id],i=e.createdAt?new Date(e.createdAt):new Date,o=`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,"0")}-${String(i.getDate()).padStart(2,"0")}`;return s?{id:e._id,analysisId:e.analysis_id,name:(null==(t=s.analysis)?void 0:t.scoreTitle)||"未知产品",score:(null==(a=s.analysis)?void 0:a.score)||0,image:s.fileID||"/static/images/placeholder.jpg",date:o,analysis:s.analysis||{}}:(console.warn(`未找到ID为${e.analysis_id}的分析记录，使用基础数据`),{id:e._id,analysisId:e.analysis_id,name:"未知产品",score:0,image:"/static/images/placeholder.jpg",date:o,analysis:{}})}));console.log("处理后的收藏项:",l),1===this.page?this.favoritesList=l:this.favoritesList=[...this.favoritesList,...l],this.hasMore=l.length===this.pageSize,l.length>0&&this.page++}catch(t){console.error("获取收藏失败:",t),e.index.showToast({title:"获取收藏失败",icon:"none"})}finally{this.loading=!1,e.index.stopPullDownRefresh()}}},refreshFavorites(){this.page=1,this.hasMore=!0,this.loadFavorites()},loadMore(){this.loadFavorites()},getScoreClass:e=>e>=90?"score-high":e>=70?"score-medium":"score-low",goToResult(t){const a={analysis:t.analysis,imageId:t.image,analysisId:t.analysisId,isFavorite:!0};e.index.setStorageSync("completeAnalysisData",a),e.index.navigateTo({url:"/pages/result/result?from=favorites"})},goToCamera(){e.index.navigateTo({url:"/pages/camera/camera"})},clearFavorites(){e.index.showModal({title:"提示",content:"确定要清空所有收藏记录吗？",success:async t=>{if(t.confirm)try{this.loading=!0;const t=e.index.getStorageSync("user_openid");if(!t)return e.index.showToast({title:"请先登录",icon:"none"}),void(this.loading=!1);const a=await e.nr.callFunction({name:"toggleFavorite",data:{action:"clearAll",openid:t}});a.result&&0===a.result.code?(this.favoritesList=[],e.index.showToast({title:"已清空收藏",icon:"success"})):e.index.showToast({title:"操作失败",icon:"none"})}catch(a){console.error("清空收藏失败:",a),e.index.showToast({title:"清空收藏失败",icon:"none"})}finally{this.loading=!1}}})},handleSearch(e){this.searchText=e.detail.value},setDefaultImage(e){e.image="/static/images/placeholder.jpg"}}};const s=e._export_sfc(a,[["render",function(a,s,i,o,n,r){return e.e({a:e.o(((...e)=>r.clearFavorites&&r.clearFavorites(...e))),b:e.o([e=>n.searchText=e.detail.value,(...e)=>r.handleSearch&&r.handleSearch(...e)]),c:n.searchText,d:n.loading},(n.loading,{}),{e:!n.loading&&n.favoritesList.length>0},!n.loading&&n.favoritesList.length>0?{f:e.f(r.filteredFavorites,((t,a,s)=>({a:t.image,b:e.o((e=>r.setDefaultImage(t)),a),c:e.t(t.name),d:e.t(t.date),e:e.n(r.getScoreClass(t.score)),f:a,g:e.o((e=>r.goToResult(t)),a)}))),g:t._imports_0$1}:{},{h:!n.loading&&0===n.favoritesList.length},n.loading||0!==n.favoritesList.length?{}:{i:t._imports_1$1,j:e.o(((...e)=>r.goToCamera&&r.goToCamera(...e)))},{k:e.o(((...e)=>r.loadMore&&r.loadMore(...e)))})}]]);wx.createPage(s);
