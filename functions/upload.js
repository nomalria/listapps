const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const { lists, temporaryLists } = JSON.parse(event.body);
        const token = event.headers.authorization?.split(' ')[1];

        if (!token) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        // GitHub API를 사용하여 데이터 저장
        const content = Buffer.from(JSON.stringify({ lists, temporaryLists })).toString('base64');
        const username = process.env.GITHUB_USERNAME;
        const repo = process.env.GITHUB_REPO;

        if (!username || !repo) {
            throw new Error('GitHub 저장소 설정이 완료되지 않았습니다.');
        }

        // 기존 파일의 SHA 값 가져오기
        let sha;
        try {
            const getResponse = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/data.json`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'List-App'
                }
            });
            if (getResponse.ok) {
                const fileData = await getResponse.json();
                sha = fileData.sha;
            }
        } catch (error) {
            console.log('기존 파일이 없습니다. 새로 생성합니다.');
        }

        // 파일 업로드
        const response = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/data.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'List-App'
            },
            body: JSON.stringify({
                message: '목록 데이터 업데이트',
                content: content,
                sha: sha
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'GitHub API 요청 실패');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        console.error('GitHub 업로드 오류:', error);
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