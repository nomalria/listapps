// 전역 변수
let lists = [];
let temporaryLists = [];
let currentListId = null;

// 삭제 확인을 위한 타이머 객체
const deleteTimers = {};

// 현재 선택된 추천문구 인덱스
let selectedIndex = -1;

// 전역 변수 추가
let editingListId = null;
let editingMemoId = null;

// GitHub OAuth 설정
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_REDIRECT_URI = `${window.location.origin}/callback`;
const GITHUB_AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=repo`;

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

// 방덱 검색
function searchLists(query) {
    const searchResults = document.getElementById('searchResults');
    const lists = JSON.parse(localStorage.getItem('lists') || '[]');
    
    if (!query) {
        searchResults.innerHTML = '';
        selectedIndex = -1;
        return;
    }

    // 현재 입력된 단어들을 가져옴
    const currentWords = query.split(' ').filter(w => w);
    const lastWord = currentWords[currentWords.length - 1];

    // 모든 방덱의 단어들을 추출
    const allWords = new Set();
    lists.forEach(list => {
        const words = list.title.split(' ');
        words.forEach(word => allWords.add(word));
    });

    // 검색어와 일치하는 단어들 찾기 (마지막 단어와 일치하는 것만)
    const matchingWords = Array.from(allWords).filter(word => 
        word.toLowerCase().includes(lastWord.toLowerCase()) &&
        !currentWords.includes(word) // 이미 입력된 단어는 제외
    );

    if (matchingWords.length > 0) {
        searchResults.innerHTML = matchingWords.map((word, index) => `
            <div class="list-item ${index === selectedIndex ? 'selected' : ''}" 
                 data-word="${word}" 
                 data-index="${index}"
                 onclick="selectWord('${word}')">
                <span>${word}</span>
            </div>
        `).join('');
    } else {
        searchResults.innerHTML = '';
        selectedIndex = -1;
    }
}

// 단어 선택 시 검색창에 추가
function selectWord(word) {
    const searchInput = document.getElementById('searchInput');
    const currentWords = searchInput.value.trim().split(' ').filter(w => w);
    
    // 마지막 단어를 선택한 단어로 교체
    if (currentWords.length > 0) {
        currentWords[currentWords.length - 1] = word;
    } else {
        currentWords.push(word);
    }
    
    searchInput.value = currentWords.join(' ');
    document.getElementById('searchResults').innerHTML = '';
    selectedIndex = -1;
}

// 방덱이 동일한지 확인하는 함수
function isSameList(list1, list2) {
    const words1 = list1.split(' ');
    const words2 = list2.split(' ');
    
    // 첫 번째와 두 번째 단어가 일치하는지 확인
    if (words1[0] !== words2[0] || words1[1] !== words2[1]) {
        return false;
    }
    
    // 나머지 단어들을 정렬하여 비교
    const remainingWords1 = words1.slice(2).sort();
    const remainingWords2 = words2.slice(2).sort();
    
    return remainingWords1.join(' ') === remainingWords2.join(' ');
}

// 방덱 추가
function addNewList() {
    const searchInput = document.getElementById('searchInput');
    const title = searchInput.value.trim();
    
    if (!title) return;
    
    // 동일한 방덱이 있는지 확인
    const existingListIndex = lists.findIndex(list => isSameList(list.title, title));
    const temporaryListIndex = temporaryLists.findIndex(list => isSameList(list.title, title));
    
    if (existingListIndex !== -1) {
        // 기존 방덱을 임시 목록의 맨 위로 이동
        const existingList = lists.splice(existingListIndex, 1)[0];
        temporaryLists.unshift(existingList);
        renderTemporaryLists();
    } else if (temporaryListIndex !== -1) {
        // 임시 목록에 있는 방덱을 맨 위로 이동
        const existingList = temporaryLists.splice(temporaryListIndex, 1)[0];
        temporaryLists.unshift(existingList);
        renderTemporaryLists();
    } else {
        // 새 방덱을 임시 목록에 추가
        const newList = {
            id: Date.now().toString(),
            title: title,
            memos: []
        };
        temporaryLists.unshift(newList);
        renderTemporaryLists();
    }
    
    searchInput.value = '';
    updateStats();
}

// 임시 목록 렌더링
function renderTemporaryLists() {
    const temporaryListsContainer = document.getElementById('temporaryLists');
    temporaryListsContainer.innerHTML = temporaryLists.map(list => `
        <div class="list-item" data-list-id="${list.id}">
            <div class="list-title">
                <span class="list-title-text">${list.title}</span>
                <span class="memo-count">${list.memos.length}/50</span>
                <div class="button-group">
                    <button class="edit-btn" onclick="startEditList('${list.id}', true)">편집</button>
                    <button class="delete-btn" onclick="deleteList('${list.id}', true)">삭제</button>
                </div>
            </div>
            <div class="edit-section" id="editSection-${list.id}">
                <div class="input-group">
                    <input type="text" id="editListInput-${list.id}" placeholder="방덱 제목 수정..." onkeypress="if(event.key === 'Enter') saveListEdit('${list.id}', true)">
                    <div class="edit-buttons">
                        <button class="save-btn" onclick="saveListEdit('${list.id}', true)">저장</button>
                        <button class="cancel-btn" onclick="cancelListEdit('${list.id}', true)">취소</button>
                    </div>
                </div>
            </div>
            <div class="memo-section" id="memoSection-${list.id}">
                <div class="input-group">
                    <input type="text" id="newMemoInput-${list.id}" placeholder="메모 추가..." onkeypress="if(event.key === 'Enter') addMemo('${list.id}', true)">
                    <button onclick="addMemo('${list.id}', true)">추가</button>
                </div>
                <div class="memo-list">
                    ${list.memos.map(memo => `
                        <div class="memo-item" data-memo-id="${memo.id}">
                            <span class="memo-text">${memo.text}</span>
                            <div class="memo-buttons">
                                <button class="edit-btn" onclick="startEditMemo('${list.id}', '${memo.id}', true)">편집</button>
                                <button class="delete-btn" onclick="deleteMemo('${list.id}', '${memo.id}', true)">삭제</button>
                            </div>
                            <div class="edit-section" id="editMemoSection-${memo.id}">
                                <div class="input-group">
                                    <input type="text" id="editMemoInput-${memo.id}" placeholder="메모 내용 수정..." onkeypress="if(event.key === 'Enter') saveMemoEdit('${list.id}', '${memo.id}', true)">
                                    <div class="edit-buttons">
                                        <button class="save-btn" onclick="saveMemoEdit('${list.id}', '${memo.id}', true)">저장</button>
                                        <button class="cancel-btn" onclick="cancelMemoEdit('${list.id}', '${memo.id}', true)">취소</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');

    // 임시 목록의 이벤트 리스너 추가
    document.querySelectorAll('#temporaryLists .list-title').forEach(title => {
        title.addEventListener('click', function(e) {
            if (!e.target.closest('.button-group')) {
                const listId = this.closest('.list-item').dataset.listId;
                toggleMemos(listId);
            }
        });
    });
}

// 방덱 삭제
function deleteList(listId, isTemporary = false) {
    if (confirm('해당 목록을 삭제하시겠습니까?')) {
        if (isTemporary) {
            // 임시 목록에서 삭제
            temporaryLists = temporaryLists.filter(list => list.id.toString() !== listId.toString());
            renderTemporaryLists();
            updateStats();
        } else {
            // 기존 목록에서 삭제
            lists = lists.filter(list => list.id.toString() !== listId.toString());
            saveLists();
            renderLists();
            updateStats();
        }
    }
}

// 메모 추가
function addMemo(listId, isTemporary = false) {
    const memoInput = document.getElementById(`newMemoInput-${listId}`);
    const memoText = memoInput.value.trim();
    
    if (memoText) {
        const targetLists = isTemporary ? temporaryLists : lists;
        const list = targetLists.find(l => l.id.toString() === listId.toString());
        if (list) {
            if (list.memos.length >= 50) {
                alert('한 방덱에는 최대 50개의 메모만 추가할 수 있습니다.');
                return;
            }
            list.memos.push({
                id: Date.now().toString(),
                text: memoText
            });
            if (!isTemporary) {
                saveLists();
            }
            isTemporary ? renderTemporaryLists() : renderLists();
            memoInput.value = '';
        }
    }
}

// 메모 삭제
function deleteMemo(listId, memoId, isTemporary = false) {
    if (confirm('해당 메모를 삭제하시겠습니까?')) {
        const targetLists = isTemporary ? temporaryLists : lists;
        const list = targetLists.find(l => l.id.toString() === listId.toString());
        if (list) {
            list.memos = list.memos.filter(memo => memo.id.toString() !== memoId.toString());
            if (!isTemporary) {
                saveLists();
            }
            isTemporary ? renderTemporaryLists() : renderLists();
        }
    }
}

// 방덱 목록 렌더링
function renderLists() {
    const listsContainer = document.getElementById('lists');
    listsContainer.innerHTML = lists.map(list => `
        <div class="list-item" data-list-id="${list.id}">
            <div class="list-title">
                <span class="list-title-text">${list.title}</span>
                <span class="memo-count">${list.memos.length}/50</span>
                <div class="button-group">
                    <button class="edit-btn" onclick="startEditList('${list.id}')">편집</button>
                    <button class="delete-btn" onclick="deleteList('${list.id}')">삭제</button>
                </div>
            </div>
            <div class="edit-section" id="editSection-${list.id}">
                <div class="input-group">
                    <input type="text" id="editListInput-${list.id}" placeholder="방덱 제목 수정..." onkeypress="if(event.key === 'Enter') saveListEdit('${list.id}')">
                    <div class="edit-buttons">
                        <button class="save-btn" onclick="saveListEdit('${list.id}')">저장</button>
                        <button class="cancel-btn" onclick="cancelListEdit('${list.id}')">취소</button>
                    </div>
                </div>
            </div>
            <div class="memo-section" id="memoSection-${list.id}">
                <div class="input-group">
                    <input type="text" id="newMemoInput-${list.id}" placeholder="메모 추가..." onkeypress="if(event.key === 'Enter') addMemo('${list.id}')">
                    <button onclick="addMemo('${list.id}')">추가</button>
                </div>
                <div class="memo-list">
                    ${list.memos.map(memo => `
                        <div class="memo-item" data-memo-id="${memo.id}">
                            <span class="memo-text">${memo.text}</span>
                            <div class="memo-buttons">
                                <button class="edit-btn" onclick="startEditMemo('${list.id}', '${memo.id}')">편집</button>
                                <button class="delete-btn" onclick="deleteMemo('${list.id}', '${memo.id}')">삭제</button>
                            </div>
                            <div class="edit-section" id="editMemoSection-${memo.id}">
                                <div class="input-group">
                                    <input type="text" id="editMemoInput-${memo.id}" placeholder="메모 내용 수정..." onkeypress="if(event.key === 'Enter') saveMemoEdit('${list.id}', '${memo.id}')">
                                    <div class="edit-buttons">
                                        <button class="save-btn" onclick="saveMemoEdit('${list.id}', '${memo.id}')">저장</button>
                                        <button class="cancel-btn" onclick="cancelMemoEdit('${list.id}', '${memo.id}')">취소</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');

    // 이벤트 리스너 추가
    document.querySelectorAll('.list-title').forEach(title => {
        title.addEventListener('click', function(e) {
            if (!e.target.closest('.button-group')) {
                const listId = this.closest('.list-item').dataset.listId;
                toggleMemos(listId);
            }
        });
    });
}

// 방덱 클릭 처리
function handleListClick(listId) {
    // 편집 중인 방덱이나 메모가 있으면 저장
    if (editingListId) {
        saveListEdit(editingListId);
    }
    if (editingMemoId) {
        const list = lists.find(l => l.memos.some(m => m.id === editingMemoId));
        if (list) {
            saveMemoEdit(list.id, editingMemoId);
        }
    }
    
    // 메모 섹션 토글
    toggleMemos(listId);
}

// 메모 섹션 토글
function toggleMemos(listId) {
    const memoSection = document.getElementById(`memoSection-${listId}`);
    const isExpanded = memoSection.classList.contains('expanded');
    
    // 모든 열린 메모 섹션 닫기
    document.querySelectorAll('.memo-section.expanded').forEach(section => {
        if (section.id !== `memoSection-${listId}`) {
            section.classList.remove('expanded');
        }
    });
    
    // 현재 선택된 섹션 토글
    memoSection.classList.toggle('expanded');
    
    // 스크롤 위치 조정
    if (!isExpanded) {
        const listItem = memoSection.closest('.list-item');
        const listItemRect = listItem.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // 메모 섹션이 뷰포트 하단에 가려질 경우 스크롤 조정
        if (listItemRect.bottom + 500 > viewportHeight) {
            window.scrollTo({
                top: window.scrollY + (listItemRect.bottom + 500 - viewportHeight),
                behavior: 'smooth'
            });
        }
    }
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
        // JSON 문자열 생성
        const jsonString = JSON.stringify(lists, null, 2);
        
        // Base64 인코딩
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));
        
        // 파일 존재 여부 확인
        let sha;
        try {
            const checkResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });
            
            if (checkResponse.ok) {
                const data = await checkResponse.json();
                sha = data.sha;
            }
        } catch (error) {
            console.log('파일이 존재하지 않습니다. 새로 생성합니다.');
        }
        
        // 요청 본문 준비
        const requestBody = {
            message: 'Update lists.json',
            content: base64Content
        };
        
        // SHA가 있으면 추가
        if (sha) {
            requestBody.sha = sha;
        }
        
        // GitHub API 호출
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            alert('GitHub에 업로드되었습니다.');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || '업로드 실패');
        }
    } catch (error) {
        alert('GitHub에 업로드하는 중 오류가 발생했습니다: ' + error.message);
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
            
            // Base64 디코딩
            const base64Content = data.content;
            const binaryContent = atob(base64Content);
            
            // UTF-8 디코딩
            const decodedContent = decodeURIComponent(escape(binaryContent));
            
            // JSON 파싱
            try {
                lists = JSON.parse(decodedContent);
                saveLists();
                renderLists();
                alert('GitHub에서 데이터를 불러왔습니다.');
            } catch (parseError) {
                console.error('JSON 파싱 오류:', parseError);
                alert('데이터를 불러오는 중 오류가 발생했습니다. 인코딩 문제일 수 있습니다.');
            }
        } else {
            throw new Error('데이터 불러오기 실패');
        }
    } catch (error) {
        alert('GitHub에서 데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 목록 및 메모 정렬
function sortAll() {
    // 임시 목록의 항목들을 기존 목록에 추가
    lists = [...temporaryLists, ...lists];
    
    // 단어 순으로 정렬
    lists.sort((a, b) => {
        const wordsA = a.title.split(' ');
        const wordsB = b.title.split(' ');
        return wordsA[0].localeCompare(wordsB[0]) || wordsA[1].localeCompare(wordsB[1]);
    });
    
    // 임시 목록 비우기
    temporaryLists = [];
    
    // 목록 저장 및 렌더링
    saveLists();
    renderLists();
    renderTemporaryLists();
    updateStats();
}

// 방덱 편집 시작
function startEditList(listId, isTemporary = false) {
    const targetLists = isTemporary ? temporaryLists : lists;
    const list = targetLists.find(l => l.id.toString() === listId.toString());
    if (!list) return;

    const editSection = document.getElementById(`editSection-${listId}`);
    if (!editSection) return;

    const input = document.getElementById(`editListInput-${listId}`);
    if (input) {
        input.value = list.title;
        input.focus();
        input.select();
    }

    editSection.style.display = 'block';
    editingListId = listId;
}

// 방덱 편집 저장
function saveListEdit(listId, isTemporary = false) {
    const input = document.getElementById(`editListInput-${listId}`);
    if (!input) return;

    const newTitle = input.value.trim();
    if (!newTitle) {
        alert('방덱 제목을 입력해주세요.');
        return;
    }

    const targetLists = isTemporary ? temporaryLists : lists;
    const list = targetLists.find(l => l.id.toString() === listId.toString());
    if (list) {
        list.title = newTitle;
        if (!isTemporary) {
            saveLists();
        }
        isTemporary ? renderTemporaryLists() : renderLists();
    }

    editingListId = null;
}

// 방덱 편집 취소
function cancelListEdit(listId, isTemporary = false) {
    const editSection = document.getElementById(`editSection-${listId}`);
    if (editSection) {
        editSection.style.display = 'none';
    }
    editingListId = null;
}

// 메모 편집 시작
function startEditMemo(listId, memoId, isTemporary = false) {
    const targetLists = isTemporary ? temporaryLists : lists;
    const list = targetLists.find(l => l.id.toString() === listId.toString());
    if (!list) {
        console.error('방덱을 찾을 수 없습니다:', listId);
        return;
    }

    const memo = list.memos.find(m => m.id.toString() === memoId.toString());
    if (!memo) {
        console.error('메모를 찾을 수 없습니다:', memoId);
        return;
    }

    const editSection = document.getElementById(`editMemoSection-${memoId}`);
    if (!editSection) {
        console.error('편집 섹션을 찾을 수 없습니다:', memoId);
        return;
    }

    const input = document.getElementById(`editMemoInput-${memoId}`);
    if (input) {
        input.value = memo.text;
        input.focus();
        input.select();
    }

    editSection.style.display = 'block';
    editingMemoId = memoId;
}

// 메모 편집 저장
function saveMemoEdit(listId, memoId, isTemporary = false) {
    const input = document.getElementById(`editMemoInput-${memoId}`);
    if (!input) {
        console.error('입력 필드를 찾을 수 없습니다:', memoId);
        return;
    }

    const newText = input.value.trim();
    if (!newText) {
        alert('메모 내용을 입력해주세요.');
        return;
    }

    const targetLists = isTemporary ? temporaryLists : lists;
    const list = targetLists.find(l => l.id.toString() === listId.toString());
    if (list) {
        const memo = list.memos.find(m => m.id.toString() === memoId.toString());
        if (memo) {
            memo.text = newText;
            if (!isTemporary) {
                saveLists();
            }
            isTemporary ? renderTemporaryLists() : renderLists();
        } else {
            console.error('메모를 찾을 수 없습니다:', memoId);
        }
    } else {
        console.error('방덱을 찾을 수 없습니다:', listId);
    }

    editingMemoId = null;
}

// 메모 편집 취소
function cancelMemoEdit(listId, memoId, isTemporary = false) {
    const editSection = document.getElementById(`editMemoSection-${memoId}`);
    if (editSection) {
        editSection.style.display = 'none';
    }
    editingMemoId = null;
}

// GitHub 로그인
function handleGitHubLogin() {
    window.location.href = GITHUB_AUTH_URL;
}

// GitHub 토큰 가져오기
async function getGitHubToken() {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return null;

    try {
        const response = await fetch('/.netlify/functions/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });

        if (!response.ok) {
            throw new Error('토큰을 가져오는데 실패했습니다.');
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('토큰 가져오기 오류:', error);
        return null;
    }
}

// 페이지 로드 시 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', async function() {
    // 초기 데이터 로드
    loadLists();
    
    // GitHub 로그인 버튼 이벤트 리스너
    document.getElementById('githubLoginBtn').addEventListener('click', handleGitHubLogin);
    
    // GitHub 토큰 확인
    const token = await getGitHubToken();
    if (token) {
        window.GITHUBTOKEN = token;
        // URL에서 code 파라미터 제거
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // 검색 입력 필드에 이벤트 리스너 추가
    document.getElementById('searchInput').addEventListener('input', function() {
        const query = this.value.trim();
        if (query) {
            searchLists(query);
        } else {
            document.getElementById('searchResults').innerHTML = '';
        }
    });
    
    // Enter 키 이벤트 처리
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                addNewList();
            }
        }
    });
    
    // 추가 버튼 이벤트 리스너
    document.getElementById('addListBtn').addEventListener('click', addNewList);
    
    // 정렬 버튼 이벤트 리스너
    document.getElementById('sortBtn').addEventListener('click', sortAll);
    
    // GitHub 버튼 이벤트 리스너
    document.getElementById('uploadGithubBtn').addEventListener('click', uploadToGithub);
    document.getElementById('loadGithubBtn').addEventListener('click', loadFromGithub);
});

// 선택된 항목 업데이트
function updateSelectedItem(items) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
} 