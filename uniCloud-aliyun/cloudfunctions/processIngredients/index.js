'use strict';

// AI分析配料的云函数
const processIngredients = async (event, context) => {
	console.log('开始处理配料分析任务');
	
	// 获取数据库实例
	const db = uniCloud.database();
	const cmd = db.command;
	
	// 创建配料集合对象
	const ingredientCollection = db.collection('ingredients');
	const analysesCollection = db.collection('ingredient_analyses');
	
	try {
		// 步骤1：从ingredient_analyses中提取所有配料名称并存储到ingredients表
		const extractedCount = await extractIngredientNames(db, cmd);
		
		// 步骤2：批量分析ingredients表中未分析的配料
		const analyzedCount = await analyzeIngredients(db, cmd);
		
		console.log('所有配料处理完成');
		
		return {
			code: 0,
			message: '配料处理成功',
			extractedCount: extractedCount,
			analyzedCount: analyzedCount
		};
		
	} catch (error) {
		console.error('处理配料时出错:', error);
		return {
			code: -1,
			message: '处理配料时出错',
			error: error.message
		};
	}
};

// 导出主函数供云函数直接调用
exports.main = processIngredients;

// 同时导出供其他模块导入
exports.processIngredients = processIngredients;

/**
 * 步骤1：从ingredient_analyses中提取配料名称
 */
async function extractIngredientNames(db, cmd) {
	console.log('开始从分析记录中提取配料名称');
	
	// 创建配料集合对象
	const ingredientCollection = db.collection('ingredients');
	const analysesCollection = db.collection('ingredient_analyses');
	
	// 查询未处理过的分析记录
	const analyses = await analysesCollection.where({
		// 不存在processed字段或processed为false
		processed: cmd.or([
			cmd.eq(false),
			cmd.exists(false)
		])
	}).limit(10).get();
	
	if (!analyses.data || analyses.data.length === 0) {
		console.log('没有需要处理的配料分析记录');
		return 0;
	}
	
	console.log(`找到${analyses.data.length}条需要处理的分析记录`);
	
	// 用于存储所有的更新Promise
	const updatePromises = [];
	// 用于跟踪提取的配料名称，避免重复提取
	const extractedIngredients = new Set();
	
	// 处理每条分析记录
	for (const analysis of analyses.data) {
		// 检查是否有ingredients数组
		if (!analysis.analysis || !analysis.analysis.ingredients || !Array.isArray(analysis.analysis.ingredients)) {
			console.log(`分析记录 ${analysis._id} 缺少配料数据，标记为已处理`);
			// 标记为已处理
			updatePromises.push(
				analysesCollection.doc(analysis._id).update({
					processed: true,
					processedAt: new Date()
				})
			);
			continue;
		}
		
		// 提取每个配料的名称
		const addIngredientPromises = [];
		
		for (const ingredient of analysis.analysis.ingredients) {
			// 跳过没有名称的配料
			if (!ingredient.name) continue;
			
			// 检查是否已经提取过该配料
			if (extractedIngredients.has(ingredient.name)) {
				console.log(`配料 "${ingredient.name}" 已经在本次任务中提取过，跳过`);
				continue;
			}
			
			// 标记为已提取
			extractedIngredients.add(ingredient.name);
			
			// 查询数据库中是否已存在该配料
			const existingIngredient = await ingredientCollection.where({
				name: ingredient.name
			}).limit(1).get();
			
			// 如果配料已存在，跳过
			if (existingIngredient.data && existingIngredient.data.length > 0) {
				console.log(`配料 "${ingredient.name}" 已存在于数据库中，跳过提取`);
				continue;
			}
			
			console.log(`提取配料名称: "${ingredient.name}"`);
			
			// 将配料名称添加到ingredients表（仅保存名称，标记为未分析）
			addIngredientPromises.push(
				ingredientCollection.add({
					name: ingredient.name,
					analyzed: false,
					createdAt: new Date(),
					updatedAt: new Date()
				})
			);
		}
		
		// 等待所有配料名称添加完成
		await Promise.all(addIngredientPromises);
		
		// 标记分析记录为已处理
		updatePromises.push(
			analysesCollection.doc(analysis._id).update({
				processed: true,
				processedAt: new Date()
			})
		);
	}
	
	// 等待所有更新操作完成
	await Promise.all(updatePromises);
	
	console.log(`已从分析记录中提取${extractedIngredients.size}个配料名称`);
	return extractedIngredients.size;
}

/**
 * 步骤2：分析ingredients表中未分析的配料
 */
async function analyzeIngredients(db, cmd) {
	console.log('开始分析未处理的配料');
	
	// 创建配料集合对象
	const ingredientCollection = db.collection('ingredients');
	
	// 查询未分析的配料
	const ingredients = await ingredientCollection.where({
		// analyzed字段为false或不存在
		analyzed: cmd.or([
			cmd.eq(false),
			cmd.exists(false)
		])
	}).limit(30).get();
	
	if (!ingredients.data || ingredients.data.length === 0) {
		console.log('没有需要分析的配料');
		return 0;
	}
	
	console.log(`找到${ingredients.data.length}个需要分析的配料`);
	
	// 批量分析配料，使用Promise.all实现并行处理
	const analyzePromises = [];
	const analyzedCount = ingredients.data.length;
	
	for (const ingredient of ingredients.data) {
		analyzePromises.push(analyzeIngredient(ingredient.name, ingredient._id));
	}
	
	// 并行等待所有配料分析完成
	const results = await Promise.all(analyzePromises);
	
	// 统计成功和失败的数量
	const successCount = results.filter(r => !r.processingError).length;
	const failureCount = results.filter(r => r.processingError).length;
	
	console.log(`配料分析完成。成功: ${successCount}, 失败: ${failureCount}`);
	return analyzedCount;
}

/**
 * 分析单个配料并更新数据库
 */
async function analyzeIngredient(ingredientName, ingredientId) {
	try {
		console.log(`分析配料: ${ingredientName}`);
		
		// 获取数据库实例
		const db = uniCloud.database();
		
		// 从数据库获取AI Token
		const tokenRecord = await db.collection('settings').limit(1).get();
		
		if (!tokenRecord.data || tokenRecord.data.length === 0) {
			throw new Error('未找到AI Token配置');
		}
		
		const aiToken = tokenRecord.data[0].ai_chat;
		
		// 创建AI分析提示
		const prompt = `
			请分析以下食品配料的详细信息，包括其分类、常见用途、潜在风险和安全性评估：
			
			配料名称: ${ingredientName}
			
			1.安全判定标准：
			危险标记：该成分在中国大陆、欧盟、美国、日本、韩国任一地区的现行食品添加剂标准中被：
			a) 明确禁止使用
			b) 限制使用（需注明限制条件）
			c) 列出违规的地区，以及相应的条款

			2.分析该配料成分的类别,精确到剂型

			3.识别该配料成分的主要用途

			4.输出要求采用JSON格式输出
			{
			"name":"成分名称",
			"safety_status": "危险/安全",
			"functions":"主要用途(说明食品中为什么要添加这个)",
			"category":"调味料-甜味剂",
			"regulations":["违规地区及条款"]
			}
			
			5.只要输出json格式，其他什么都不要输出，不要解释，不要说明
		`;
		
		// 导入axios模块
		const axios = require('axios');
		
		// 调用硅基流动AI API分析配料
		const response = await axios({
			method: 'POST',
			url: 'https://api.siliconflow.cn/v1/chat/completions',
			headers: {
				'Authorization': `Bearer ${aiToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				model: 'Qwen/Qwen2.5-72B-Instruct', // 使用适合文本分析的模型
				messages: [
					{
						role: 'user',
						content: prompt
					}
				],
				stream: false,
				max_tokens: 1024,
				stop: null,
				temperature: 0.3, // 降低随机性以获得更确定的答案
				top_p: 0.7,
				top_k: 50,
				frequency_penalty: 0.5,
				n: 1,
				response_format: {
					type: 'text'
				}
			}
		});
		
		// 提取JSON结果
		let ingredientData;
		try {
			// 检查响应结构
			if (response.data && response.data.choices && response.data.choices.length > 0) {
				let content = response.data.choices[0].message.content;
				console.log('AI原始回复:', content);
				
				// 清理响应内容
				content = content
					// 移除markdown代码块标记
					.replace(/```json\s+|\s+```/g, '')
					.replace(/```\s+|\s+```/g, '')
					// 移除注释
					.replace(/\/\/.*$/gm, '')
					// 移除可能存在的省略号
					.replace(/\.\.\.+/g, '')
					// 移除换行和制表符，使JSON更紧凑
					.replace(/[\r\n\t]/g, ' ')
					.trim();
				
				// 提取JSON部分 - 查找第一个{和最后一个}之间的内容
				let jsonStart = content.indexOf('{');
				let jsonEnd = content.lastIndexOf('}');
				
				if (jsonStart >= 0 && jsonEnd > jsonStart) {
					content = content.substring(jsonStart, jsonEnd + 1);
				}
				
				// 修复JSON格式问题：将单引号替换为双引号，确保键名有双引号
				content = content.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
				content = content.replace(/'/g, '"');
				
				// 处理常见的JSON格式问题
				content = content.replace(/"([^"]+)":\s*,/g, '"$1":"",');
				content = content.replace(/"([^"]+)":\s*}/g, '"$1":""}');
				
				console.log('处理后的JSON文本:', content);
				
				// 解析JSON
				ingredientData = JSON.parse(content);
				console.log('解析后的JSON数据:', ingredientData);
			} else {
				throw new Error('AI响应格式不正确');
			}
		} catch (parseError) {
			console.error(`解析AI回复时出错: ${parseError.message}`);
			throw parseError; // 向上抛出错误，不保存错误数据
		}
		
		// 确保必要字段存在
		ingredientData = {
			name: ingredientData.name || ingredientName,
			category: ingredientData.category || "未指定分类",
			safety_status: ingredientData.safety_status || "未知",
			functions: ingredientData.functions || "未知用途",
			regulations: Array.isArray(ingredientData.regulations) ? ingredientData.regulations : [],
			analyzed: true,
			updatedAt: new Date()
		};
		
		// 更新数据库中的配料记录
		await db.collection('ingredients').doc(ingredientId).update(ingredientData);
		
		console.log(`配料 "${ingredientName}" 分析完成并更新`);
		return ingredientData;
		
	} catch (error) {
		console.error(`分析配料 "${ingredientName}" 时出错:`, error);
		
		// 标记为分析失败，但不填充错误数据
		if (ingredientId) {
			try {
				await db.collection('ingredients').doc(ingredientId).update({
					analyzed: true,
					analyzeFailed: true,
					errorMessage: error.message,
					updatedAt: new Date()
				});
				console.log(`已标记配料 "${ingredientName}" 分析失败`);
			} catch (updateError) {
				console.error(`标记配料失败状态时出错:`, updateError);
			}
		}
		
		// 返回错误信息，但不中断处理流程
		return {
			name: ingredientName,
			error: error.message,
			processingError: true
		};
	}
} 