const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const token = event.headers.authorization?.split(' ')[1];

        if (!token) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        const username = process.env.GITHUB_USERNAME;
        const repo = process.env.GITHUB_REPO;

        if (!username || !repo) {
            throw new Error('GitHub 저장소 설정이 완료되지 않았습니다.');
        }

        // GitHub API를 사용하여 데이터 가져오기
        const response = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/data.json`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'List-App'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'GitHub API 요청 실패');
        }

        const data = await response.json();
        const content = JSON.parse(Buffer.from(data.content, 'base64').toString());

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(content)
        };
    } catch (error) {
        console.error('GitHub 다운로드 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                details: error.stack
            })
        };
    }
}; 