"use strict";const e=require("../../common/vendor.js"),s=require("../../common/assets.js"),t={data:()=>({historyList:[{id:1,name:"某品牌薯片",image:"/static/images/sample1.jpg",time:"10:30",score:85},{id:2,name:"某品牌饮料",image:"/static/images/sample2.jpg",time:"09:15",score:92}]}),computed:{groupedHistory(){const e={};return this.historyList.forEach((s=>{const t="今天";e[t]||(e[t]=[]),e[t].push(s)})),e}},methods:{getScoreClass:e=>e>=90?"score-high":e>=70?"score-medium":"score-low",goToResult(s){e.index.navigateTo({url:`/pages/result/result?id=${s.id}`})},goToCamera(){e.index.navigateTo({url:"/pages/camera/camera"})},clearHistory(){e.index.showModal({title:"提示",content:"确定要清空所有历史记录吗？",success:e=>{e.confirm&&(this.historyList=[])}})}}};const o=e._export_sfc(t,[["render",function(t,o,r,i,a,c){return e.e({a:e.o(((...e)=>c.clearHistory&&c.clearHistory(...e))),b:e.f(c.groupedHistory,((s,t,o)=>({a:e.t(t),b:e.f(s,((s,t,o)=>({a:s.image,b:e.t(s.name),c:e.t(s.time),d:e.t(s.score),e:e.n(c.getScoreClass(s.score)),f:t,g:e.o((e=>c.goToResult(s)),t)}))),c:t}))),c:0===a.historyList.length},0===a.historyList.length?{d:s._imports_0$3,e:e.o(((...e)=>c.goToCamera&&c.goToCamera(...e)))}:{})}]]);wx.createPage(o);
