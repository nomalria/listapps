const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { lists, temporaryLists } = JSON.parse(event.body);
        const token = event.headers.authorization?.split(' ')[1];

        if (!token) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        // GitHub API를 사용하여 데이터 저장
        const response = await fetch('https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/data.json', {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Your-App-Name'
            },
            body: JSON.stringify({
                message: 'Update lists data',
                content: Buffer.from(JSON.stringify({ lists, temporaryLists })).toString('base64'),
                sha: await getFileSha(token)
            })
        });

        if (!response.ok) {
            throw new Error('GitHub API request failed');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function getFileSha(token) {
    const response = await fetch('https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/data.json', {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'Your-App-Name'
        }
    });

    if (response.ok) {
        const data = await response.json();
        return data.sha;
    }
    return null;
} 