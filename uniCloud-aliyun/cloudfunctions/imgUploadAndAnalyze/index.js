'use strict';

const db = uniCloud.database();
const axios = require('axios');

exports.main = async (event, context) => {
	try {
		// 1. 从数据库获取AI Token
		const tokenRecord = await db.collection('settings').limit(1).get();
		
		if (!tokenRecord.data || tokenRecord.data.length === 0) {
			return {
				code: -1,
				message: '未找到AI Token配置',
				data: null
			};
		}
		
		const aiToken = tokenRecord.data[0].ai_chat;
		
		// 2. 检查输入参数
		if (!event.fileID) {
			return {
				code: -2,
				message: '请提供配料表图片的fileID',
				data: null
			};
		}
		
		if (!event.productImageID) {
			return {
				code: -2,
				message: '请提供商品图片的fileID',
				data: null
			};
		}
		
		console.log('开始处理图片...');
		console.log('配料表图片ID:', event.fileID);
		console.log('商品图片ID:', event.productImageID);
		
		// 3. 获取两张图片的内容
		const getImageContent = async (fileID) => {
			try {
				// 获取临时访问链接
				const tempFileResult = await uniCloud.getTempFileURL({
					fileList: [fileID]
				});
				
				if (tempFileResult.fileList && tempFileResult.fileList.length > 0) {
					const fileInfo = tempFileResult.fileList[0];
					if (fileInfo.tempFileURL) {
						console.log('成功获取临时URL:', fileInfo.tempFileURL);
						
						// 下载图片内容
						const imageResponse = await axios({
							method: 'GET',
							url: fileInfo.tempFileURL,
							responseType: 'arraybuffer',
							timeout: 30000 // 增加超时时间到30秒
						});
						
						console.log('图片下载成功，数据大小:', imageResponse.data.length, '字节');
						
						// 转换为base64
						const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
						
						// 根据fileID猜测MIME类型
						const fileType = fileID.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
						return `data:${fileType};base64,${base64Image}`;
					}
				}
				throw new Error('获取临时文件URL失败');
			} catch (error) {
				console.error('获取文件内容失败:', error);
				throw error;
			}
		};
		
		// 4. 并行获取两张图片的内容
		console.log('开始并行获取两张图片的内容...');
		let ingredientImageContent, productImageContent;
		
		try {
			[ingredientImageContent, productImageContent] = await Promise.all([
				getImageContent(event.fileID),
				getImageContent(event.productImageID)
			]);
			console.log('两张图片内容获取成功');
		} catch (error) {
			return {
				code: -4,
				message: '获取图片内容失败: ' + error.message,
				data: null,
				detail: error.stack || '无详细错误信息'
			};
		}
		
		// 5. 并行调用AI API进行配料表和商品名分析
		console.log('开始并行调用AI API分析图片...');
		
		// 配料表分析的AI提示
		const ingredientPrompt = `这张图片是食品配料表。请分析图中识别的所有配料及其安全性。
请严格按照以下JSON格式返回结果，必须是完整有效的标准JSON，不得使用省略号或其他简化符号。

请按照以下要求操作：
1. 每个配料必须有完整的所有字段信息，不能使用省略号、注释或简写
2. 完整输出所有JSON结构，不要用"..."或类似符号简化或省略任何内容
3. 确保返回的JSON能通过JSON.parse()验证，不要添加多余的逗号或缺少必要的逗号
4. 相同的成分只出现一次，不要重复列出。例如"食用盐"和"盐"视为同一种成分

JSON格式如下：
{
  "score": 75,
  "scoreTitle": "中等安全性",
  "scoreDesc": "简要描述产品安全性",
  "ingredients": [
    {
      "name": "成分1名称"
    },
    {
      "name": "成分2名称"
    }
  ],
  "nutritionDesc": "营养描述",
  "suitablePeople": "适宜人群"
}

再次提醒：
- 不要使用省略号或任何简化符号
- 每个配料必须包含完整的所有字段
- 确保JSON格式完整有效，检查所有引号和括号是否匹配
- 最终JSON应该能通过JSON.parse()验证`;

		// 商品名称分析的AI提示
		const productPrompt = `这张图片是食品包装上的商品名称部分。请识别并提取图片中的食品名称。
请严格按照以下JSON格式返回结果，必须是完整有效的标准JSON：

{
  "productName": "完整的商品名称",
  "brandName": "品牌名称（如有）",
  "productType": "产品类型（如：饼干、饮料、零食等）"
}

只需识别商品的名称信息，不需要分析成分。请确保JSON格式正确，可以被JSON.parse()解析。`;
		
		// 创建两个AI请求
		const ingredientAnalysisPromise = axios({
			method: 'POST',
			url: 'https://api.siliconflow.cn/v1/chat/completions',
			headers: {
				'Authorization': `Bearer ${aiToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				model: 'Qwen/Qwen2.5-VL-32B-Instruct',
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: ingredientPrompt },
							{ type: 'image_url', image_url: { url: ingredientImageContent } }
						]
					}
				],
				stream: false,
				max_tokens: 2048,
				temperature: 0.2,
				top_p: 0.8
			}
		});
		
		const productAnalysisPromise = axios({
			method: 'POST',
			url: 'https://api.siliconflow.cn/v1/chat/completions',
			headers: {
				'Authorization': `Bearer ${aiToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				model: 'Qwen/Qwen2.5-VL-32B-Instruct',
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: productPrompt },
							{ type: 'image_url', image_url: { url: productImageContent } }
						]
					}
				],
				stream: false,
				max_tokens: 1024,
				temperature: 0.2,
				top_p: 0.8
			}
		});
		
		// 并行执行两个AI请求
		let ingredientResponse, productResponse;
		
		try {
			[ingredientResponse, productResponse] = await Promise.all([
				ingredientAnalysisPromise,
				productAnalysisPromise
			]);
			console.log('两个AI API调用成功，处理返回结果...');
		} catch (error) {
			console.error('AI API调用失败:', error);
			return {
				code: -5,
				message: 'AI API调用失败: ' + error.message,
				data: null
			};
		}
		
		// 6. 处理配料表分析结果
		let ingredientData = null;
		
		if (ingredientResponse.data && ingredientResponse.data.choices && ingredientResponse.data.choices.length > 0) {
			try {
				// 获取返回内容
				let messageContent = ingredientResponse.data.choices[0].message.content;
				console.log('配料表AI返回内容:', messageContent);
				
				// 修复常见的JSON格式问题
				messageContent = messageContent
					// 提取JSON的核心内容，移除markdown标记和注释
					.replace(/```json\s+|\s+```/g, '')
					.replace(/```\s+|\s+```/g, '')
					.replace(/\/\/.*$/gm, '')
					.replace(/\.\.\.+/g, '')
					
					// 移除可能存在的换行和制表符
					.replace(/[\r\n\t]/g, ' ')
					.trim();
				
				// 提取JSON部分 - 查找第一个{和最后一个}之间的内容
				let jsonStart = messageContent.indexOf('{');
				let jsonEnd = messageContent.lastIndexOf('}');
				
				if (jsonStart >= 0 && jsonEnd > jsonStart) {
					messageContent = messageContent.substring(jsonStart, jsonEnd + 1);
				}
				
				// 修复JSON格式问题：将单引号替换为双引号，确保键名有双引号
				messageContent = messageContent.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
				messageContent = messageContent.replace(/'/g, '"');
				
				// 处理特定的JSON格式问题
				messageContent = messageContent.replace(/"([^"]+)":\s*,/g, '"$1":"",');
				messageContent = messageContent.replace(/"([^"]+)":\s*}/g, '"$1":""}');
				messageContent = messageContent.replace(/"([^"]+)":\s*]/g, '"$1":""]');
				
				console.log('最终清理后的配料表JSON:', messageContent);
				
				// 尝试解析JSON
				const jsonData = JSON.parse(messageContent);
				console.log('解析后的配料表JSON数据:', jsonData);
				
				// 重构数据，确保所有必要字段存在
				ingredientData = {
					score: typeof jsonData.score === 'number' ? jsonData.score : 75,
					scoreTitle: jsonData.scoreTitle || '中等安全性',
					scoreDesc: jsonData.scoreDesc || '无详细安全信息',
					ingredients: [],
					nutritionDesc: jsonData.nutritionDesc || '无营养评估',
					suitablePeople: jsonData.suitablePeople || '一般人群适量食用'
				};
				
				// 清理成分列表，只保留有效项
				if (jsonData.ingredients && Array.isArray(jsonData.ingredients)) {
					// 先提取所有有效的配料项
					const validIngredients = jsonData.ingredients
						.filter(item => item && typeof item === 'object' && item.name)
						.map(item => ({
							name: item.name || '',
							description: item.description || '',
							riskLevel: item.riskLevel || 'low',
							category: item.category || '',
							usage: item.usage || '',
							risks: item.risks || ''
						}));
					
					// 去重处理：根据名称合并相似的配料
					const uniqueIngredients = [];
					const nameMap = new Map();
					
					validIngredients.forEach(item => {
						// 标准化名称用于比较
						const normalizedName = item.name
							.replace(/\(.*?\)/g, '')
							.replace(/[，,、]/g, '')
							.trim();
						
						// 检查是否已存在类似名称
						if (nameMap.has(normalizedName)) {
							// 已存在，不添加
							return;
						}
						
						// 不存在，添加到结果并记录
						nameMap.set(normalizedName, true);
						uniqueIngredients.push(item);
					});
					
					// 使用去重后的配料列表
					ingredientData.ingredients = uniqueIngredients;
				}
			} catch (e) {
				console.error('配料表JSON解析错误:', e);
				ingredientData = {
					score: 0,
					scoreTitle: '无法分析配料表',
					scoreDesc: '无法解析AI返回的配料表结果',
					ingredients: [],
					nutritionDesc: '无法获取营养信息',
					suitablePeople: '无法确定适宜人群'
				};
			}
		}
		
		// 7. 处理商品名称分析结果
		let productData = { productName: '未知产品', brandName: '', productType: '' };
		
		if (productResponse.data && productResponse.data.choices && productResponse.data.choices.length > 0) {
			try {
				// 获取返回内容
				let messageContent = productResponse.data.choices[0].message.content;
				console.log('商品名称AI返回内容:', messageContent);
				
				// 修复常见的JSON格式问题
				messageContent = messageContent
					.replace(/```json\s+|\s+```/g, '')
					.replace(/```\s+|\s+```/g, '')
					.replace(/\/\/.*$/gm, '')
					.replace(/[\r\n\t]/g, ' ')
					.trim();
				
				// 提取JSON部分
				let jsonStart = messageContent.indexOf('{');
				let jsonEnd = messageContent.lastIndexOf('}');
				
				if (jsonStart >= 0 && jsonEnd > jsonStart) {
					messageContent = messageContent.substring(jsonStart, jsonEnd + 1);
				}
				
				// 修复JSON格式问题
				messageContent = messageContent.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
				messageContent = messageContent.replace(/'/g, '"');
				
				console.log('最终清理后的商品名称JSON:', messageContent);
				
				// 尝试解析JSON
				const jsonData = JSON.parse(messageContent);
				console.log('解析后的商品名称JSON数据:', jsonData);
				
				// 提取商品信息
				productData = {
					productName: jsonData.productName || '未知产品',
					brandName: jsonData.brandName || '',
					productType: jsonData.productType || ''
				};
			} catch (e) {
				console.error('商品名称JSON解析错误:', e);
				// 使用默认值
			}
		}
		
		// 8. 合并两张图片的分析结果
		const combinedData = {
			...ingredientData
		};
		
		console.log('合并后的完整分析数据:', combinedData,productData);
		
		// 9. 保存分析结果到数据库
		let analysis_id = null;
		try {
			const collection = db.collection('ingredient_analyses');
			const addResult = await collection.add({
				//fileID: event.fileID,
				productIngredientID: event.fileID,
				productImageID: event.productImageID,
				productName: productData.productName,
				brandName: productData.brandName,
				productType: productData.productType,
				openid: event.openid || '',
				analysis: combinedData,
				createdAt: new Date()
			});
			console.log('分析结果已保存到数据库, ID:', addResult.id);
			analysis_id = addResult.id;
		} catch (error) {
			console.error('保存分析结果失败:', error);
		}
		
		// 10. 返回结果
		return {
			code: 0,
			message: 'success',
			data: combinedData,
			analysis_id: analysis_id
		};
		
	} catch (error) {
		console.error('处理失败：', error);
		// 打印更详细的错误信息
		if (error.response) {
			console.error('错误响应数据:', error.response.data);
			console.error('错误状态码:', error.response.status);
			console.error('错误响应头:', error.response.headers);
		}
		return {
			code: -3,
			message: '处理失败：' + (error.message || JSON.stringify(error)),
			data: null
		};
	}
};
