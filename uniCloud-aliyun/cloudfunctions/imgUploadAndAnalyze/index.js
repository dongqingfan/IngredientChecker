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
		if (!event.fileContent && !event.fileID) {
			return {
				code: -2,
				message: '请提供图片内容或fileID',
				data: null
			};
		}
		
		console.log('开始处理图片...');
		
		if(!event.fileContent){
			console.log('没有提供图片内容，将尝试从fileID获取:', event.fileID);
		}
		
		let imageContent;
		let isTemporaryContent = false; // 标记是否是临时获取的内容，用于决定是否保存分析结果
		
		// 如果传入的是fileID而不是图片内容
		if (event.fileID && !event.fileContent) {
			console.log('从云存储获取图片, fileID:', event.fileID);
			isTemporaryContent = true;
			try {
				// 获取临时访问链接
				const tempFileResult = await uniCloud.getTempFileURL({
					fileList: [event.fileID]
				});
				
				console.log('获取临时URL结果:', JSON.stringify(tempFileResult));
				
				if (tempFileResult.fileList && tempFileResult.fileList.length > 0) {
					const fileInfo = tempFileResult.fileList[0];
					if (fileInfo.tempFileURL) {
						console.log('成功获取临时URL:', fileInfo.tempFileURL);
						
						// 下载图片内容
						console.log('开始下载图片内容...');
						const imageResponse = await axios({
							method: 'GET',
							url: fileInfo.tempFileURL,
							responseType: 'arraybuffer',
							timeout: 30000 // 增加超时时间到30秒
						});
						
						console.log('图片下载成功，数据大小:', imageResponse.data.length, '字节');
						
						// 转换为base64
						const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
						console.log('Base64转换完成，长度:', base64Image.length);
						
						// 根据fileID猜测MIME类型
						const fileType = event.fileID.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
						imageContent = `data:${fileType};base64,${base64Image}`;
						
						console.log('图片内容准备完成，可以开始分析');
					} else {
						console.error('临时URL不存在:', fileInfo);
						throw new Error('获取临时文件URL失败');
					}
				} else {
					console.error('临时文件列表为空:', tempFileResult);
					throw new Error('文件不存在');
				}
			} catch (error) {
				console.error('获取文件内容失败:', error);
				// 如果获取失败，返回详细错误信息
				return {
					code: -4,
					message: '获取文件内容失败: ' + error.message,
					data: null,
					detail: error.stack || '无详细错误信息'
				};
			}
		} else {
			// 使用传入的图片内容
			console.log('使用传入的图片内容，长度:', event.fileContent ? event.fileContent.length : 0);
			imageContent = `data:${event.fileType};base64,${event.fileContent}`;
			
			// 如果同时传入了fileID，则标记为需要保存分析结果
			isTemporaryContent = !event.fileID;
		}
		
		console.log('调用AI API分析配料表...');
		
		// 调用通义千问API进行配料表分析
		const response = await axios({
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
							{
								type: 'text',
								text: `这张图片是食品配料表。请分析图中识别的所有配料及其安全性。
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
- 最终JSON应该能通过JSON.parse()验证`
							},
							{
								type: 'image_url',
								image_url: {
									url: imageContent
								}
							}
						]
					}
				],
				stream: false,
				max_tokens: 2048,
				stop: null,
				temperature: 0.2,
				top_p: 0.8,
				top_k: 50,
				frequency_penalty: 0.5,
				n: 1
			}
		});
		
		console.log('AI API调用成功，处理返回结果...');
		
		// 解析返回的结果
		if (response.data && response.data.choices && response.data.choices.length > 0) {
			try {
				// 获取返回内容
				let messageContent = response.data.choices[0].message.content;
				console.log('AI返回内容:', messageContent);
				
				// 修复常见的JSON格式问题
				messageContent = messageContent
					// 提取JSON的核心内容，移除markdown标记和注释
					.replace(/```json\s+|\s+```/g, '')
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
				// 1. 确保所有key-value对都有正确的格式
				messageContent = messageContent.replace(/"([^"]+)":\s*,/g, '"$1":"",');
				messageContent = messageContent.replace(/"([^"]+)":\s*}/g, '"$1":""}');
				messageContent = messageContent.replace(/"([^"]+)":\s*]/g, '"$1":""]');
				
				console.log('最终清理后的JSON:', messageContent);
				
				try {
					// 尝试解析JSON
					const jsonData = JSON.parse(messageContent);
					console.log('解析后的JSON数据:', jsonData);
					
					// 重构数据，确保所有必要字段存在
					const cleanedData = {
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
						const nameMap = new Map(); // 用于追踪名称是否已存在
						
						validIngredients.forEach(item => {
							// 标准化名称用于比较（去除括号内容、空格和标点）
							const normalizedName = item.name
								.replace(/\(.*?\)/g, '') // 去除括号内容
								.replace(/[，,、]/g, '') // 去除常见分隔符
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
						cleanedData.ingredients = uniqueIngredients;
					}
					
					// 保存分析结果到数据库
					let analysis_id = null;
					if (event.fileID) {
						try {
							const collection = db.collection('ingredient_analyses');
							const addResult = await collection.add({
								fileID: event.fileID,
								openid: event.openid || '',
								analysis: cleanedData,
								createdAt: new Date()
							});
							console.log('分析结果已保存到数据库, ID:', addResult.id);
							analysis_id = addResult.id;
						} catch (error) {
							console.error('保存分析结果失败:', error);
						}
					}
					
					// 返回结果，包含分析ID
					return {
						code: 0,
						message: 'success',
						data: cleanedData,
						analysis_id: analysis_id
					};
				} catch (e) {
					console.error('JSON解析错误:', e);
					// 如果解析失败，返回格式化错误
					return {
						code: -1,
						message: 'JSON解析失败: ' + e.message,
						data: {
							rawText: messageContent,
							fallbackData: {
								score: 0,
								scoreTitle: '无法分析',
								scoreDesc: '无法解析AI返回的结果',
								ingredients: [],
								nutritionDesc: '无法获取营养信息',
								suitablePeople: '无法确定适宜人群'
							}
						}
					};
				}
			} catch (e) {
				console.error('JSON解析错误:', e);
				// 如果解析失败，返回原始文本
				return {
					code: 0,
					message: 'success',
					data: {
						rawText: response.data.choices[0].message.content,
						parseError: '返回结果无法解析为JSON'
					}
				};
			}
		}
		
		// 如果是saveOnly模式，直接保存提供的分析数据
		if (event.saveOnly && event.analysis) {
			try {
				console.log('saveOnly模式，直接保存提供的分析数据');
				
				// 验证openid
				if (!event.openid) {
					return {
						code: -2,
						message: '缺少openid参数',
						data: null
					};
				}
				
				// 验证fileID
				if (!event.fileID) {
					return {
						code: -2,
						message: '缺少fileID参数',
						data: null
					};
				}
				
				// 保存分析结果到数据库
				const collection = db.collection('ingredient_analyses');
				const addResult = await collection.add({
					fileID: event.fileID,
					openid: event.openid,
					analysis: event.analysis,
					createdAt: new Date()
				});
				
				console.log('分析结果已保存到数据库, ID:', addResult.id);
				
				return {
					code: 0,
					message: '保存成功',
					data: event.analysis,
					analysis_id: addResult.id
				};
			} catch (error) {
				console.error('保存分析结果失败:', error);
				return {
					code: -3,
					message: '保存分析结果失败: ' + error.message,
					data: null
				};
			}
		}
		
		return {
			code: 0,
			message: 'success',
			data: response.data
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
