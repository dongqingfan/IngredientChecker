'use strict';

// 获取数据库引用
const db = uniCloud.database();
const collection = db.collection('user_favorites');
const dbCmd = db.command;

exports.main = async (event, context) => {
	try {
		// 验证参数
		if (!event.action || !['add', 'remove', 'check', 'list', 'clearAll'].includes(event.action)) {
			return {
				code: -1,
				message: '无效的操作类型'
			};
		}
		
		// 新增clearAll操作，只需要openid
		if (event.action === 'clearAll') {
			if (!event.openid) {
				return {
					code: -2,
					message: '缺少用户openid'
				};
			}
			
			// 删除该用户的所有收藏记录
			const result = await collection.where({
				openid: event.openid
			}).remove();
			
			return {
				code: 0,
				message: '清空收藏成功',
				data: result
			};
		}
		
		if (!event.favoriteData || !event.favoriteData.openid) {
			return {
				code: -2,
				message: '参数不完整'
			};
		}
		
		const { openid, analysis_id } = event.favoriteData;
		
		// 根据操作类型执行不同的逻辑
		if (event.action === 'add') {
			// 检查ingredient_analyses表中是否存在该记录
			const analysisRecord = await db.collection('ingredient_analyses')
				.doc(analysis_id)
				.get();
				
			if (!analysisRecord.data || analysisRecord.data.length === 0) {
				return {
					code: -4,
					message: '分析记录不存在'
				};
			}
			
			// 查询是否已存在相同的收藏
			const existingRecord = await collection.where({
				openid: openid,
				analysis_id: analysis_id
			}).limit(1).get();
			
			// 如果已存在则返回成功但不重复添加
			if (existingRecord.data && existingRecord.data.length > 0) {
				return {
					code: 0,
					message: '已在收藏列表中',
					data: existingRecord.data[0]
				};
			}
			
			// 添加收藏
			const result = await collection.add({
				openid,
				analysis_id
			});
			
			return {
				code: 0,
				message: '添加收藏成功',
				data: result
			};
		} else if (event.action === 'remove') {
			// 移除收藏
			const result = await collection.where({
				openid: openid,
				analysis_id: analysis_id
			}).remove();
			
			return {
				code: 0, 
				message: '移除收藏成功',
				data: result
			};
		} else if (event.action === 'check') {
			// 检查是否已收藏
			const result = await collection.where({
				openid: openid,
				analysis_id: analysis_id
			}).limit(1).get();
			
			return {
				code: 0,
				message: '检查收藏状态成功',
				isFavorite: result.data && result.data.length > 0,
				data: result.data[0] || null
			};
		} else if (event.action === 'list') {
			// 获取用户的所有收藏，并联表查询获取详细信息
			const result = await db.collection('user_favorites,ingredient_analyses')
				.where(`user_favorites.openid == '${openid}' && user_favorites.analysis_id == ingredient_analyses._id`)
				.field('user_favorites._id as favorite_id, ingredient_analyses._id as analysis_id, ingredient_analyses.fileID, ingredient_analyses.analysis, ingredient_analyses.createdAt')
				.orderBy('user_favorites.createdAt desc')
				.get();
			
			return {
				code: 0,
				message: '查询收藏列表成功',
				data: result.data
			};
		}
	} catch (error) {
		console.error('收藏操作失败:', error);
		return {
			code: -3,
			message: '服务器错误: ' + error.message,
			error: error
		};
	}
}; 