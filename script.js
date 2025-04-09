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

// GitHub 관련 함수들
async function uploadToGithub() {
    try {
        const token = getGithubToken();
        if (!token) {
            alert('GitHub 토큰을 입력해주세요.');
            return;
        }
        
        const lists = JSON.parse(localStorage.getItem('lists') || '[]');
        const content = btoa(JSON.stringify(lists, null, 2));
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Update lists data',
                content: content
            })
        });

        if (!response.ok) {
            throw new Error('GitHub 업로드 실패');
        }

        alert('GitHub에 성공적으로 업로드되었습니다!');
    } catch (error) {
        console.error('GitHub 업로드 오류:', error);
        alert('GitHub 업로드 중 오류가 발생했습니다.');
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
        const content = atob(data.content);
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
    document.getElementById('uploadGithubBtn').addEventListener('click', uploadToGithub);
    document.getElementById('loadGithubBtn').addEventListener('click', loadFromGithub);
    
    // 기존 이벤트 리스너들
    document.getElementById('addListBtn').addEventListener('click', addNewList);
    document.getElementById('addMemoBtn').addEventListener('click', addMemo);
    
    // 초기 리스트 표시
    renderLists();
}); 