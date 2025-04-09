// 전역 변수
let lists = [];
let currentListId = null;

// 삭제 확인을 위한 타이머 객체
const deleteTimers = {};

// 방덱 목록 불러오기
function loadLists() {
    const savedLists = localStorage.getItem('lists');
    if (savedLists) {
        lists = JSON.parse(savedLists);
        renderLists();
        updateStats();
    }
}

// 방덱 목록 저장
function saveLists() {
    localStorage.setItem('lists', JSON.stringify(lists));
    updateStats();
}

// 검색 기능
function searchLists(query) {
    const searchResults = document.getElementById('searchResults');
    const lists = JSON.parse(localStorage.getItem('lists') || '[]');
    
    if (!query) {
        searchResults.innerHTML = '';
        return;
    }

    const results = lists.filter(list => 
        list.title.toLowerCase().includes(query.toLowerCase())
    );

    searchResults.innerHTML = results.map(list => `
        <div class="list-item" onclick="selectList('${list.id}')">
            <span>${list.title}</span>
            <span class="memo-count">${list.memos.length}개의 메모</span>
        </div>
    `).join('');
}

// 검색 입력 이벤트 리스너
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchLists(e.target.value);
});

// 방덱으로 스크롤
function scrollToList(listId) {
    const listElement = document.querySelector(`[data-list-id="${listId}"]`);
    if (listElement) {
        listElement.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('searchResults').classList.remove('show');
        document.getElementById('searchInput').value = '';
    }
}

// 방덱 찾기
function findList(query) {
    return lists.find(list => 
        list.title.toLowerCase() === query.toLowerCase()
    );
}

// 새 방덱 추가
function addNewList() {
    const searchInput = document.getElementById('searchInput');
    const title = searchInput.value.trim();
    
    if (title) {
        // 중복 체크
        if (lists.some(list => list.title.toLowerCase() === title.toLowerCase())) {
            alert('이미 존재하는 방덱입니다.');
            return;
        }
        
        const newList = {
            id: Date.now().toString(),
            title: title,
            memos: []
        };
        
        lists.push(newList);
        saveLists();
        renderLists();
        
        // 입력 필드 초기화
        searchInput.value = '';
        document.getElementById('searchResults').classList.remove('show');
    }
}

// 방덱 삭제
function deleteList(listId) {
    if (confirm('정말 삭제하시겠습니까?')) {
        lists = lists.filter(list => list.id !== listId);
        saveLists();
        renderLists();
    }
}

// 메모 추가
function addMemo(listId) {
    const memoInput = document.getElementById(`memoInput-${listId}`);
    const memoText = memoInput.value.trim();
    
    if (memoText) {
        const list = lists.find(l => l.id === listId);
        if (list && list.memos.length < 50) {
            list.memos.push({
                id: Date.now().toString(),
                text: memoText
            });
            saveLists();
            renderLists();
            memoInput.value = '';
        } else {
            alert('메모는 최대 50개까지만 추가할 수 있습니다.');
        }
    }
}

// 메모 삭제
function deleteMemo(listId, memoId) {
    const list = lists.find(l => l.id === listId);
    if (list) {
        list.memos = list.memos.filter(memo => memo.id !== memoId);
        saveLists();
        renderLists();
    }
}

// 방덱 목록 렌더링
function renderLists() {
    const listsContainer = document.getElementById('lists');
    listsContainer.innerHTML = lists.map(list => `
        <div class="list-item" data-list-id="${list.id}">
            <div class="list-title" onclick="toggleMemos('${list.id}')">
                <span>${list.title}</span>
                <span class="memo-count">${list.memos.length}/50</span>
                <div class="button-group">
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteList('${list.id}')">삭제</button>
                </div>
            </div>
            <div class="memo-section" id="memoSection-${list.id}">
                <div class="input-group">
                    <input type="text" id="memoInput-${list.id}" placeholder="메모 추가..." onkeypress="if(event.key === 'Enter') addMemo('${list.id}')">
                    <button onclick="addMemo('${list.id}')">추가</button>
                </div>
                <div class="memo-list">
                    ${list.memos.map(memo => `
                        <div class="memo-item">
                            <span>${memo.text}</span>
                            <button class="delete-btn" onclick="deleteMemo('${list.id}', '${memo.id}')">삭제</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// 메모 섹션 토글
function toggleMemos(listId) {
    const memoSection = document.getElementById(`memoSection-${listId}`);
    memoSection.classList.toggle('expanded');
}

// 통계 업데이트
function updateStats() {
    const stats = {
        '4deck': 0,
        '5deck': 0,
        'other': 0
    };
    
    lists.forEach(list => {
        if (list.title.includes('4방덱')) {
            stats['4deck']++;
        } else if (list.title.includes('5방덱')) {
            stats['5deck']++;
        } else {
            stats['other']++;
        }
    });
    
    document.getElementById('stat-4deck').textContent = stats['4deck'];
    document.getElementById('stat-5deck').textContent = stats['5deck'];
    document.getElementById('stat-other').textContent = stats['other'];
}

// GitHub에 업로드
async function uploadToGithub() {
    const token = getGithubToken();
    if (!token) {
        alert('GitHub 토큰을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update lists data',
                content: btoa(JSON.stringify(lists, null, 2))
            })
        });
        
        if (response.ok) {
            alert('GitHub에 업로드되었습니다.');
        } else {
            throw new Error('업로드 실패');
        }
    } catch (error) {
        alert('GitHub 업로드 중 오류가 발생했습니다: ' + error.message);
    }
}

// GitHub에서 불러오기
async function loadFromGithub() {
    const token = getGithubToken();
    if (!token) {
        alert('GitHub 토큰을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const content = atob(data.content);
            lists = JSON.parse(content);
            saveLists();
            renderLists();
            alert('GitHub에서 데이터를 불러왔습니다.');
        } else {
            throw new Error('데이터 불러오기 실패');
        }
    } catch (error) {
        alert('GitHub에서 데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    loadLists();
    
    // 추가 버튼 이벤트 리스너
    document.getElementById('addListBtn').addEventListener('click', addNewList);
    
    // GitHub 버튼 이벤트 리스너
    document.getElementById('uploadGithubBtn').addEventListener('click', uploadToGithub);
    document.getElementById('loadGithubBtn').addEventListener('click', loadFromGithub);
}); 