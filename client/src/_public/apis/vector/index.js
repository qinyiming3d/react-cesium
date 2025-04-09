import { request } from "@_public/apis/request";

// 获取技能树名称
export const getSkillsByIds = (skillIds) => {
    return request.post({
        url: '/api/skills',
        data: {
            skillIds
        }
    })
}