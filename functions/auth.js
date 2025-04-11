const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const { code } = JSON.parse(event.body);
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        const redirectUri = 'https://llsitappss.netlify.app';

        if (!clientId || !clientSecret) {
            throw new Error('GitHub OAuth 설정이 완료되지 않았습니다.');
        }

        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error_description || 'GitHub 토큰 요청 실패');
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error_description || data.error);
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('GitHub OAuth 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                details: error.stack
            }),
        };
    }
}; 
