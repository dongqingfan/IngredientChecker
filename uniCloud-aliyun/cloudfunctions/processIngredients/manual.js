'use strict';

// 导入主处理函数
const { processIngredients } = require('./index.js');

/**
 * 手动触发配料处理的入口函数
 * 可以通过控制台或HTTP调用此云函数
 */
exports.main = async (event, context) => {
	console.log('手动触发配料处理');
	
	// 调用主处理函数
	const result = await processIngredients(event, context);
	
	return {
		...result,
		manualTrigger: true,
		triggerTime: new Date().toISOString()
	};
}; 