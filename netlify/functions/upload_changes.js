// netlify/functions/upload_changes.js
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
    const { temporaryLists } = requestBody;
    if (!Array.isArray(temporaryLists)) {
         return { statusCode: 400, body: JSON.stringify({ message: 'Bad Request: Missing or invalid temporaryLists' }) };
    }

    // 3. GitHub 저장소 정보 설정 (Netlify 환경 변수 사용 권장)
    const owner = process.env.GITHUB_OWNER; // 예: 'your-github-username'
    const repo = process.env.GITHUB_REPO;   // 예: 'your-repo-name'
    const path = 'changes.json'; // 변경사항 저장 파일 경로
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const commitMessage = 'Update changes data via web app';

    try {
        // 4. (중요!) 현재 파일의 SHA 가져오기 (업데이트 시 필수)
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
            } else if (getResponse.status === 404) {
                console.log(`File ${path} not found. Will create a new file.`);
                // 파일이 없으면 SHA는 null 그대로 둡니다.
            } else {
                // 404 외의 다른 오류 발생
                const errorText = await getResponse.text();
                throw new Error(`GitHub GET error (${getResponse.status}): ${errorText}`);
            }
        } catch(getErr) {
             console.error("Error getting current file info:", getErr);
             // SHA 가져오기 실패 시에도 일단 진행 시도 (최초 업로드일 수 있음)
             // 또는 여기서 에러 처리하고 중단할 수도 있음
             // return { statusCode: 500, body: JSON.stringify({ message: `Failed to get file info: ${getErr.message}` }) };
        }


        // 5. 전송할 콘텐츠 준비 (JSON 문자열화 -> Base64 인코딩)
        const contentString = JSON.stringify(temporaryLists, null, 2); // 가독성을 위해 null, 2 추가 (선택사항)
        const contentBase64 = Buffer.from(contentString).toString('base64');
        console.log(`Uploading ${temporaryLists.length} items to ${path}. Content size: ${contentString.length} bytes.`);

        // 6. (핵심!) GitHub API로 파일 업데이트 (PUT 요청) - **한 번만 호출**
        console.log(`Sending PUT request to ${apiUrl}`);
        const putResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json' // API 버전 명시 (권장)
            },
            body: JSON.stringify({
                message: commitMessage,
                content: contentBase64,
                sha: currentSha // 파일이 존재하면 이전 SHA 포함 (필수!), 없으면 null
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
            statusCode: 200, // 성공
            body: JSON.stringify({ message: 'Changes uploaded successfully' }),
        };

    } catch (error) {
        console.error('Error in upload_changes function:', error);
        return {
            statusCode: 500, // 서버 내부 오류
            body: JSON.stringify({ message: `Failed to upload changes: ${error.message}` }),
        };
    }
};