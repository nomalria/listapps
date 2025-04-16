// netlify/functions/download_changes.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // 1. 요청 메서드 및 토큰 확인
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }
    const token = event.headers.authorization?.split(' ')[1];
    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: Missing token' }) };
    }

    // 2. GitHub 저장소 정보 설정
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const path = 'changes.json'; // 변경사항 파일 경로
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    try {
        // 3. GitHub API로 파일 내용 가져오기 (GET 요청)
        console.log(`Fetching content for ${path}`);
        const getResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let temporaryLists = []; // 기본값은 빈 배열

        if (getResponse.ok) {
            const fileInfo = await getResponse.json();
            if (fileInfo.content) {
                // 4. Base64 디코딩 및 JSON 파싱
                const contentString = Buffer.from(fileInfo.content, 'base64').toString('utf-8');
                temporaryLists = JSON.parse(contentString);
                console.log(`Successfully downloaded and parsed ${path}. Items: ${temporaryLists.length}`);
            } else {
                 console.log(`File ${path} exists but content is empty.`);
            }
        } else if (getResponse.status === 404) {
            console.log(`File ${path} not found. Returning empty array.`);
            // 파일이 없으면 temporaryLists는 그대로 빈 배열
        } else {
            // 404 외의 다른 오류
            const errorText = await getResponse.text();
            throw new Error(`GitHub GET error (${getResponse.status}): ${errorText}`);
        }

        // 5. 클라이언트에 데이터 반환
        return {
            statusCode: 200,
            body: JSON.stringify({ temporaryLists: temporaryLists }), // 클라이언트가 기대하는 형식
        };

    } catch (error) {
        console.error('Error in download_changes function:', error);
        // JSON 파싱 오류 등 포함
        if (error instanceof SyntaxError) {
             return { statusCode: 500, body: JSON.stringify({ message: `Failed to parse changes file content: ${error.message}` }) };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Failed to download changes: ${error.message}` }),
        };
    }
};