// 로컬 스토리지에서 데이터 로드
let lists = JSON.parse(localStorage.getItem('lists')) || [];

// 전역 함수 선언
window.addNewList = function() {
    const titleInput = document.getElementById('newList');
    const title = titleInput.value.trim();
    
    if (title) {
        const newList = {
            id: Date.now(),
            title: title,
            memos: []
        };
        
        lists.push(newList);
        saveLists();
        renderLists();
        titleInput.value = '';
    }
};

window.addMemo = function(listId) {
    const memoInput = document.getElementById(`memo-input-${listId}`);
    const memoText = memoInput.value.trim();
    
    if (memoText) {
        const list = lists.find(l => l.id === listId);
        if (list) {
            list.memos.push({
                id: Date.now(),
                text: memoText
            });
            saveLists();
            renderLists();
            memoInput.value = '';
        }
    }
};

window.deleteList = function(listId) {
    lists = lists.filter(list => list.id !== listId);
    saveLists();
    renderLists();
};

window.deleteMemo = function(listId, memoId) {
    const list = lists.find(l => l.id === listId);
    if (list) {
        list.memos = list.memos.filter(memo => memo.id !== memoId);
        saveLists();
        renderLists();
    }
};

// 목록 렌더링
function renderLists() {
    const container = document.getElementById('lists');
    if (!container) return;
    
    container.innerHTML = '';
    
    lists.forEach(list => {
        const listElement = document.createElement('div');
        listElement.className = 'list-item';
        
        // 목록 제목과 삭제 버튼
        const titleDiv = document.createElement('div');
        titleDiv.className = 'list-title';
        titleDiv.innerHTML = `
            ${list.title}
            <button class="delete-list-btn" onclick="deleteList(${list.id})">삭제</button>
        `;
        
        // 메모 섹션
        const memoSection = document.createElement('div');
        memoSection.className = 'memo-section';
        
        // 메모 입력 필드
        const memoInput = document.createElement('input');
        memoInput.type = 'text';
        memoInput.id = `memo-input-${list.id}`;
        memoInput.className = 'memo-input';
        memoInput.placeholder = '새 메모 추가';
        
        // 메모 추가 버튼
        const addMemoBtn = document.createElement('button');
        addMemoBtn.textContent = '메모 추가';
        addMemoBtn.onclick = () => addMemo(list.id);
        
        // 메모 목록
        const memoList = document.createElement('ul');
        memoList.className = 'memo-list';
        
        list.memos.forEach(memo => {
            const memoItem = document.createElement('li');
            memoItem.className = 'memo-item';
            memoItem.innerHTML = `
                ${memo.text}
                <button class="delete-memo-btn" onclick="deleteMemo(${list.id}, ${memo.id})">삭제</button>
            `;
            memoList.appendChild(memoItem);
        });
        
        // 메모 섹션에 요소 추가
        memoSection.appendChild(memoInput);
        memoSection.appendChild(addMemoBtn);
        memoSection.appendChild(memoList);
        
        // 목록 요소에 추가
        listElement.appendChild(titleDiv);
        listElement.appendChild(memoSection);
        
        container.appendChild(listElement);
    });
}

// 로컬 스토리지에 저장
function saveLists() {
    localStorage.setItem('lists', JSON.stringify(lists));
}

// GitHub에 업로드
window.uploadToGithub = async function() {
    try {
        // GitHub API 응답 확인을 위한 테스트
        console.log('토큰 확인:', GITHUBTOKEN ? '토큰 있음' : '토큰 없음');
        
        const data = JSON.stringify(lists, null, 2);
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUBTOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: 'Update lists data',
                content: btoa(unescape(encodeURIComponent(data))),
                branch: 'main'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API Error:', errorData);
            throw new Error(`업로드 실패 (${response.status}: ${errorData.message})`);
        }
        
        const responseData = await response.json();
        console.log('업로드 성공:', responseData);
        alert('GitHub에 성공적으로 업로드되었습니다.');
    } catch (error) {
        console.error('Error:', error);
        alert(`GitHub 업로드 중 오류가 발생했습니다: ${error.message}`);
    }
};

// GitHub에서 불러오기
window.loadFromGithub = async function() {
    try {
        console.log('토큰 확인:', GITHUBTOKEN ? '토큰 있음' : '토큰 없음');
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            headers: {
                'Authorization': `token ${GITHUBTOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API Error:', errorData);
            throw new Error(`데이터 불러오기 실패 (${response.status}: ${errorData.message})`);
        }

        const data = await response.json();
        console.log('데이터 불러오기 성공:', data);
        const content = decodeURIComponent(escape(atob(data.content)));
        lists = JSON.parse(content);
        saveLists();
        renderLists();
        alert('GitHub에서 데이터를 성공적으로 불러왔습니다.');
    } catch (error) {
        console.error('Error:', error);
        alert(`GitHub에서 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
};

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    // 초기 목록 렌더링
    renderLists();
}); 