// netlify/functions/download_all.js
const fetch = require('node-fetch');

// GitHub 파일 내용을 가져오는 헬퍼 함수
async function fetchGitHubFileContent(token, owner, repo, path) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    console.log(`Fetching content for ${path}`);
    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const fileInfo = await response.json();
            if (fileInfo.content) {
                const contentString = Buffer.from(fileInfo.content, 'base64').toString('utf-8');
                return JSON.parse(contentString); // 파싱된 JSON 배열 반환
            }
             console.log(`File ${path} exists but content is empty.`);
             return []; // 내용 없으면 빈 배열
        } else if (response.status === 404) {
            console.log(`File ${path} not found. Returning empty array.`);
            return []; // 파일 없으면 빈 배열
        } else {
            const errorText = await response.text();
            throw new Error(`GitHub GET error for ${path} (${response.status}): ${errorText}`);
        }
    } catch (error) {
        console.error(`Error fetching or parsing ${path}:`, error);
         // JSON 파싱 오류 포함
        if (error instanceof SyntaxError) {
             throw new Error(`Failed to parse ${path} content: ${error.message}`);
        }
        throw error; // 다른 오류는 그대로 전달
    }
}

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
    const mainListPath = 'lists.json';
    const changesListPath = 'changes.json';

    try {
        // 3. 두 파일 내용을 병렬로 가져오기 (Promise.all 사용)
        const [listsData, temporaryListsData] = await Promise.all([
            fetchGitHubFileContent(token, owner, repo, mainListPath),
            fetchGitHubFileContent(token, owner, repo, changesListPath)
        ]);

        console.log(`Downloaded main lists: ${listsData.length} items.`);
        console.log(`Downloaded temporary lists: ${temporaryListsData.length} items.`);

        // 4. 클라이언트에 데이터 반환
        return {
            statusCode: 200,
            body: JSON.stringify({
                lists: listsData,
                temporaryLists: temporaryListsData
            }),
        };

    } catch (error) {
        console.error('Error in download_all function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Failed to download all data: ${error.message}` }),
        };
    }
};