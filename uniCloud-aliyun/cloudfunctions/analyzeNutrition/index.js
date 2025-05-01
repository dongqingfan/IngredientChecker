'use strict';

const db = uniCloud.database();
const axios = require('axios'); // 需要在云函数package.json中添加axios依赖

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
		const nutritionDetails = event.nutritionDetails;
		const quality = event.quality;
		
		if (!nutritionDetails) {
			return {
				code: -2,
				message: '请提供营养成分详情',
				data: null
			};
		}
		
		// 3. 调用通义千问API
		const response = await callQwenAPI(aiToken, nutritionDetails, quality);
		
		// 4. 返回结果
		return {
			code: 0,
			message: 'success',
			data: response
		};
		
	} catch (error) {
		console.error('营养分析失败：', error);
		return {
			code: -3,
			message: '处理失败：' + (error.message || JSON.stringify(error)),
			data: null
		};
	}
};

// 调用通义千问API的函数
async function callQwenAPI(token, nutritionDetails, quality) {
	try {
		const response = await axios({
			method: 'POST',
			url: 'https://api.siliconflow.cn/v1/chat/completions',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			data: {
				model: 'Qwen/Qwen2.5-7B-Instruct',
				messages: [
					{
						role: 'user',
						content: `分析以下食品的营养成分和质量信息，并提供评估。

营养成分信息:
${JSON.stringify(nutritionDetails)}

质量信息:
${JSON.stringify(quality)}

请按照以下要求输出:
1. 营养成分用一句话描述出来，给个成分都要显示出来
2. 根据营养成分给一个食用建议(50字以内)

输出一下json内容,其他的不要输出，不要解释
{
"nutritionDesc":"xxx",
"suitablePeople":"xxx"
}`
					}
				],
				stream: false,
				max_tokens: 512,
				stop: null,
				temperature: 0.1,
				top_p: 0.7,
				top_k: 50,
				frequency_penalty: 0.5,
				n: 1,
				response_format: {
					type: "json_object"
				}
			}
		});
		
		// 解析返回的结果
		if (response.data && response.data.choices && response.data.choices.length > 0) {
			try {
				// 尝试将结果解析为JSON
				const messageContent = response.data.choices[0].message.content;
				console.log(messageContent);
				const jsonData = JSON.parse(messageContent);
				console.log(jsonData);
				return jsonData;
			} catch (e) {
				// 如果解析失败，直接返回原始文本
				return {
					nutritionDesc: "无法解析营养信息",
					suitablePeople: "请咨询专业人士获取食用建议"
				};
			}
		}
		
		return {
			nutritionDesc: "未能获取营养信息",
			suitablePeople: "建议参考产品包装获取食用建议"
		};
	} catch (error) {
		console.error('调用AI API失败:', error);
		throw new Error('AI分析失败: ' + (error.response?.data?.message || error.message));
	}
}
