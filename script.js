// 로컬 스토리지에서 데이터 로드
let lists = JSON.parse(localStorage.getItem('lists')) || [];

// 삭제 확인을 위한 타이머 객체
const deleteTimers = {};

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
    const timerKey = `list_${listId}`;
    
    if (deleteTimers[timerKey]) {
        // 두 번째 클릭: 실제 삭제 실행
        clearTimeout(deleteTimers[timerKey]);
        delete deleteTimers[timerKey];
        
        lists = lists.filter(list => list.id !== listId);
        saveLists();
        renderLists();
    } else {
        // 첫 번째 클릭: 확인 타이머 설정
        const listElement = document.querySelector(`[data-list-id="${listId}"]`);
        const deleteBtn = listElement.querySelector('.delete-list-btn');
        deleteBtn.textContent = '삭제 확인';
        deleteBtn.style.backgroundColor = '#ff4444';
        
        deleteTimers[timerKey] = setTimeout(() => {
            deleteBtn.textContent = '삭제';
            deleteBtn.style.backgroundColor = '';
            delete deleteTimers[timerKey];
        }, 2000);
    }
};

window.deleteMemo = function(listId, memoId) {
    const timerKey = `memo_${listId}_${memoId}`;
    
    if (deleteTimers[timerKey]) {
        // 두 번째 클릭: 실제 삭제 실행
        clearTimeout(deleteTimers[timerKey]);
        delete deleteTimers[timerKey];
        
        const list = lists.find(l => l.id === listId);
        if (list) {
            list.memos = list.memos.filter(memo => memo.id !== memoId);
            saveLists();
            renderLists();
        }
    } else {
        // 첫 번째 클릭: 확인 타이머 설정
        const memoElement = document.querySelector(`[data-memo-id="${memoId}"]`);
        const deleteBtn = memoElement.querySelector('.delete-memo-btn');
        deleteBtn.textContent = '삭제 확인';
        deleteBtn.style.backgroundColor = '#ff4444';
        
        deleteTimers[timerKey] = setTimeout(() => {
            deleteBtn.textContent = '삭제';
            deleteBtn.style.backgroundColor = '';
            delete deleteTimers[timerKey];
        }, 2000);
    }
};

// 목록 제목 편집 함수
function editListTitle(listId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    const titleElement = document.querySelector(`[data-list-id="${listId}"] .list-title span`);
    const currentTitle = list.title;
    
    titleElement.innerHTML = `
        <input type="text" value="${currentTitle}" class="edit-input">
        <button onclick="saveListTitle(${listId})">저장</button>
        <button onclick="cancelEdit(${listId}, 'list')">취소</button>
    `;
}

// 목록 제목 저장 함수
function saveListTitle(listId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    const input = document.querySelector(`[data-list-id="${listId}"] .list-title input`);
    list.title = input.value.trim();
    saveLists();
    renderLists();
}

// 메모 내용 편집 함수
function editMemoText(listId, memoId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    const memo = list.memos.find(m => m.id === memoId);
    if (!memo) return;
    
    const memoElement = document.querySelector(`[data-memo-id="${memoId}"]`);
    const currentText = memo.text;
    
    memoElement.innerHTML = `
        <input type="text" value="${currentText}" class="edit-input">
        <button onclick="saveMemoText(${listId}, ${memoId})">저장</button>
        <button onclick="cancelEdit(${listId}, 'memo', ${memoId})">취소</button>
    `;
}

// 메모 내용 저장 함수
function saveMemoText(listId, memoId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    const memo = list.memos.find(m => m.id === memoId);
    if (!memo) return;
    
    const input = document.querySelector(`[data-memo-id="${memoId}"] input`);
    memo.text = input.value.trim();
    saveLists();
    renderLists();
}

// 편집 취소 함수
function cancelEdit(listId, type, memoId = null) {
    renderLists();
}

// 목록 정렬 함수
function sortLists() {
    lists.sort((a, b) => a.title.localeCompare(b.title));
    saveLists();
    renderLists();
}

// 메모 정렬 함수
function sortMemos(listId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    list.memos.sort((a, b) => a.text.localeCompare(b.text));
    saveLists();
    renderLists();
}

// 목록 렌더링
function renderLists() {
    const container = document.getElementById('lists');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 정렬 버튼 추가
    const sortButton = document.createElement('button');
    sortButton.textContent = '목록 정렬';
    sortButton.onclick = sortLists;
    sortButton.className = 'sort-button';
    container.appendChild(sortButton);
    
    lists.forEach(list => {
        const listElement = document.createElement('div');
        listElement.className = 'list-item';
        listElement.setAttribute('data-list-id', list.id);
        
        // 목록 제목과 버튼들
        const titleDiv = document.createElement('div');
        titleDiv.className = 'list-title';
        titleDiv.innerHTML = `
            <span>${list.title}</span>
            <button class="edit-list-btn" onclick="editListTitle(${list.id})">편집</button>
            <button class="delete-list-btn" onclick="deleteList(${list.id})">삭제</button>
        `;
        
        // 메모 섹션
        const memoSection = document.createElement('div');
        memoSection.className = 'memo-section';
        
        // 메모 정렬 버튼
        const memoSortButton = document.createElement('button');
        memoSortButton.textContent = '메모 정렬';
        memoSortButton.onclick = () => sortMemos(list.id);
        memoSortButton.className = 'sort-button';
        memoSection.appendChild(memoSortButton);
        
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
            memoItem.setAttribute('data-memo-id', memo.id);
            memoItem.innerHTML = `
                <span>${memo.text}</span>
                <button class="edit-memo-btn" onclick="editMemoText(${list.id}, ${memo.id})">편집</button>
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

// GitHub 관련 함수들
async function uploadToGithub() {
    try {
        const token = getGithubToken();
        if (!token) {
            alert('GitHub 토큰을 입력해주세요.');
            return;
        }
        
        // 먼저 기존 파일의 sha 값을 가져옵니다
        let sha = null;
        try {
            const checkResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });
            
            if (checkResponse.ok) {
                const fileData = await checkResponse.json();
                sha = fileData.sha;
            }
        } catch (error) {
            console.log('기존 파일이 없거나 접근할 수 없습니다. 새로 생성합니다.');
        }
        
        const lists = JSON.parse(localStorage.getItem('lists') || '[]');
        // UTF-8 문자를 처리하기 위해 encodeURIComponent 사용
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(lists, null, 2))));
        
        const requestBody = {
            message: 'Update lists data',
            content: content
        };
        
        // sha 값이 있으면 추가합니다
        if (sha) {
            requestBody.sha = sha;
        }
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API Error:', errorData);
            throw new Error(`업로드 실패 (${response.status}: ${errorData.message})`);
        }

        alert('GitHub에 성공적으로 업로드되었습니다!');
    } catch (error) {
        console.error('GitHub 업로드 오류:', error);
        alert('GitHub 업로드 중 오류가 발생했습니다: ' + error.message);
    }
}

async function loadFromGithub() {
    try {
        const token = getGithubToken();
        if (!token) {
            alert('GitHub 토큰을 입력해주세요.');
            return;
        }
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('GitHub에서 데이터를 가져오는데 실패했습니다');
        }

        const data = await response.json();
        // UTF-8 문자를 처리하기 위해 decodeURIComponent 사용
        const content = decodeURIComponent(escape(atob(data.content)));
        const lists = JSON.parse(content);
        
        localStorage.setItem('lists', JSON.stringify(lists));
        renderLists();
        alert('GitHub에서 데이터를 성공적으로 불러왔습니다!');
    } catch (error) {
        console.error('GitHub 데이터 로드 오류:', error);
        alert('GitHub에서 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    // GitHub 버튼 이벤트 리스너
    const uploadGithubBtn = document.getElementById('uploadGithubBtn');
    const loadGithubBtn = document.getElementById('loadGithubBtn');
    
    if (uploadGithubBtn) {
        uploadGithubBtn.addEventListener('click', uploadToGithub);
    }
    
    if (loadGithubBtn) {
        loadGithubBtn.addEventListener('click', loadFromGithub);
    }
    
    // 기존 이벤트 리스너들
    const addListBtn = document.getElementById('addListBtn');
    if (addListBtn) {
        addListBtn.addEventListener('click', addNewList);
    }
    
    // 초기 리스트 표시
    renderLists();
}); 