// netlify/functions/upload_main.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // 1. 요청 메서드 및 토큰 확인
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }
    const token = event.headers.authorization?.split(' ')[1];
    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: Missing token' }) };
    }

    // 2. 요청 본문 파싱 및 데이터 추출
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: Invalid JSON' }) };
    }
    const { lists } = requestBody; // 여기서 lists 데이터를 받음
    if (!Array.isArray(lists)) {
         return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: Missing or invalid lists' }) };
    }

    // 3. GitHub 저장소 정보 설정
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const path = 'lists.json'; // 주 데이터 파일 경로
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const commitMessage = 'Update main lists data via web app';

    try {
        // 4. 현재 파일의 SHA 가져오기
        let currentSha = null;
        try {
            console.log(`Fetching current SHA for ${path}`);
            const getResponse = await fetch(apiUrl, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (getResponse.ok) {
                const fileInfo = await getResponse.json();
                currentSha = fileInfo.sha;
                console.log(`Found existing file SHA: ${currentSha}`);
            } else if (getResponse.status !== 404) {
                const errorText = await getResponse.text();
                throw new Error(`GitHub GET error (${getResponse.status}): ${errorText}`);
            } else {
                 console.log(`File ${path} not found. Will create a new file.`);
            }
        } catch(getErr) {
             console.error("Error getting current file info:", getErr);
             // Consider error handling or proceeding
        }

        // 5. 전송할 콘텐츠 준비 (Base64 인코딩)
        const contentString = JSON.stringify(lists, null, 2);
        const contentBase64 = Buffer.from(contentString).toString('base64');
        console.log(`Uploading ${lists.length} items to ${path}. Content size: ${contentString.length} bytes.`);

        // 6. GitHub API로 파일 업데이트 (PUT 요청)
        console.log(`Sending PUT request to ${apiUrl}`);
        const putResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: commitMessage,
                content: contentBase64,
                sha: currentSha
            }),
        });

        // 7. 응답 처리
        if (!putResponse.ok) {
            const errorBody = await putResponse.text();
            console.error(`GitHub PUT error (${putResponse.status}):`, errorBody);
            throw new Error(`GitHub PUT error: ${putResponse.statusText}`);
        }
        const responseData = await putResponse.json();
        console.log('GitHub PUT success:', responseData.commit.sha);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Main list uploaded successfully' }),
        };

    } catch (error) {
        console.error('Error in upload_main function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Failed to upload main list: ${error.message}` }),
        };
    }
};