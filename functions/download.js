const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const token = event.headers.authorization?.split(' ')[1];

        if (!token) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        // GitHub API를 사용하여 데이터 가져오기
        const response = await fetch('https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/data.json', {
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'Your-App-Name'
            }
        });

        if (!response.ok) {
            throw new Error('GitHub API request failed');
        }

        const data = await response.json();
        const content = JSON.parse(Buffer.from(data.content, 'base64').toString());

        return {
            statusCode: 200,
            body: JSON.stringify(content)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}; 