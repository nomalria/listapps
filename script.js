// 전역 변수
let lists = [];
let currentListId = null;

// 삭제 확인을 위한 타이머 객체
const deleteTimers = {};

// 현재 선택된 추천문구 인덱스
let selectedIndex = -1;

// 전역 변수 추가
let editingListId = null;
let editingMemoId = null;

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
    
    if (existingListIndex !== -1) {
        // 기존 방덱을 맨 위로 이동
        const existingList = lists.splice(existingListIndex, 1)[0];
        lists.unshift(existingList);
        searchInput.value = ''; // 검색창 초기화
    } else {
        // 새 방덱 추가
        const newList = {
            id: Date.now().toString(),
            title: title,
            memos: []
        };
        lists.unshift(newList); // 새 방덱을 맨 위에 추가
    }
    
    saveLists();
    searchInput.value = ''; // 검색창 초기화
    renderLists();
    updateStats();
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
    listsContainer.innerHTML = '';
    
    lists.forEach(list => {
        const listElement = document.createElement('div');
        listElement.className = 'list-item';
        listElement.setAttribute('data-list-id', list.id);
        
        const listTitle = document.createElement('div');
        listTitle.className = 'list-title';
        listTitle.onclick = () => toggleMemos(list.id);
        
        const titleText = document.createElement('span');
        titleText.className = 'list-title-text';
        titleText.textContent = list.title;
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.textContent = '수정';
        editButton.onclick = (e) => {
            e.stopPropagation();
            startEditList(list.id);
        };
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = '삭제';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteList(list.id);
        };
        
        buttonGroup.appendChild(editButton);
        buttonGroup.appendChild(deleteButton);
        
        listTitle.appendChild(titleText);
        listTitle.appendChild(buttonGroup);
        
        const memosContainer = document.createElement('div');
        memosContainer.className = 'memos-container';
        memosContainer.style.display = 'none';
        
        list.memos.forEach(memo => {
            const memoElement = document.createElement('div');
            memoElement.className = 'memo-item';
            memoElement.setAttribute('data-memo-id', memo.id);
            
            const memoText = document.createElement('span');
            memoText.className = 'memo-text';
            memoText.textContent = memo.text;
            
            const memoButtons = document.createElement('div');
            memoButtons.className = 'memo-buttons';
            
            const memoEditButton = document.createElement('button');
            memoEditButton.className = 'edit-btn';
            memoEditButton.textContent = '수정';
            memoEditButton.onclick = (e) => {
                e.stopPropagation();
                startEditMemo(list.id, memo.id);
            };
            
            const memoDeleteButton = document.createElement('button');
            memoDeleteButton.className = 'delete-btn';
            memoDeleteButton.textContent = '삭제';
            memoDeleteButton.onclick = (e) => {
                e.stopPropagation();
                deleteMemo(list.id, memo.id);
            };
            
            memoButtons.appendChild(memoEditButton);
            memoButtons.appendChild(memoDeleteButton);
            
            memoElement.appendChild(memoText);
            memoElement.appendChild(memoButtons);
            memosContainer.appendChild(memoElement);
        });
        
        const addMemoInput = document.createElement('input');
        addMemoInput.type = 'text';
        addMemoInput.className = 'memo-input';
        addMemoInput.placeholder = '새 메모 추가';
        addMemoInput.style.display = 'none';
        addMemoInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                addMemo(list.id, e.target.value);
                e.target.value = '';
            }
        };
        
        listElement.appendChild(listTitle);
        listElement.appendChild(memosContainer);
        listElement.appendChild(addMemoInput);
        listsContainer.appendChild(listElement);
    });
    
    updateStats();
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
    const listElement = document.querySelector(`.list-item[data-list-id="${listId}"]`);
    if (!listElement) return;

    const memosContainer = listElement.querySelector('.memos-container');
    const memoInput = listElement.querySelector('.memo-input');
    
    if (memosContainer.style.display === 'none') {
        memosContainer.style.display = 'block';
        memoInput.style.display = 'block';
        memoInput.focus();
    } else {
        memosContainer.style.display = 'none';
        memoInput.style.display = 'none';
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
    console.log('모든 방덱과 메모 정렬 시작');
    
    // 방덱 정렬
    lists.sort((a, b) => a.title.localeCompare(b.title));
    
    // 각 방덱의 메모 정렬
    lists.forEach(list => {
        list.memos.sort((a, b) => a.text.localeCompare(b.text));
    });
    
    saveLists();
    renderLists();
    console.log('정렬 완료');
}

// 방덱 편집 시작
function startEditList(listId) {
    const listElement = document.querySelector(`.list-item[data-list-id="${listId}"]`);
    if (!listElement) return;

    const titleText = listElement.querySelector('.list-title-text');
    const currentTitle = titleText.textContent;
    
    // 편집 모드 UI 생성
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-container';
    
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = currentTitle;
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'edit-buttons';
    
    const saveButton = document.createElement('button');
    saveButton.className = 'save-btn';
    saveButton.textContent = '저장';
    saveButton.onclick = function(e) {
        e.stopPropagation();
        saveListEdit(listId, editInput.value);
    };
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-btn';
    cancelButton.textContent = '취소';
    cancelButton.onclick = function(e) {
        e.stopPropagation();
        renderLists();
    };
    
    // 엔터키로 저장
    editInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            e.stopPropagation();
            saveListEdit(listId, editInput.value);
        }
    };
    
    buttonGroup.appendChild(saveButton);
    buttonGroup.appendChild(cancelButton);
    editContainer.appendChild(editInput);
    editContainer.appendChild(buttonGroup);
    
    // 원래 내용을 편집 UI로 교체
    titleText.parentNode.replaceChild(editContainer, titleText);
    editInput.focus();
}

// 방덱 편집 저장
function saveListEdit(listId, newTitle) {
    const list = lists.find(l => l.id === listId);
    if (list) {
        list.title = newTitle;
        saveLists();
        renderLists();
    }
}

// 방덱 편집 취소
function cancelListEdit(listId, originalTitle) {
    const listElement = document.querySelector(`.list-item[data-list-id="${listId}"]`);
    if (!listElement) return;

    const editContainer = listElement.querySelector('.edit-container');
    if (!editContainer) return;

    // 원래 제목으로 복원
    const titleText = document.createElement('span');
    titleText.className = 'list-title-text';
    titleText.textContent = originalTitle;
    
    editContainer.parentNode.replaceChild(titleText, editContainer);
}

// 메모 편집 시작
function startEditMemo(listId, memoId) {
    const memoElement = document.querySelector(`.memo-item[data-memo-id="${memoId}"]`);
    if (!memoElement) return;

    const memoText = memoElement.querySelector('.memo-text');
    const currentText = memoText.textContent;
    
    // 편집 모드 UI 생성
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-container';
    
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = currentText;
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'edit-buttons';
    
    const saveButton = document.createElement('button');
    saveButton.className = 'save-btn';
    saveButton.textContent = '저장';
    saveButton.onclick = function(e) {
        e.stopPropagation();
        saveMemoEdit(listId, memoId, editInput.value);
    };
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-btn';
    cancelButton.textContent = '취소';
    cancelButton.onclick = function(e) {
        e.stopPropagation();
        renderLists();
    };
    
    // 엔터키로 저장
    editInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            e.stopPropagation();
            saveMemoEdit(listId, memoId, editInput.value);
        }
    };
    
    buttonGroup.appendChild(saveButton);
    buttonGroup.appendChild(cancelButton);
    editContainer.appendChild(editInput);
    editContainer.appendChild(buttonGroup);
    
    // 원래 내용을 편집 UI로 교체
    memoText.parentNode.replaceChild(editContainer, memoText);
    editInput.focus();
}

// 메모 편집 저장
function saveMemoEdit(listId, memoId, newText) {
    const list = lists.find(l => l.id === listId);
    if (list) {
        const memo = list.memos.find(m => m.id === memoId);
        if (memo) {
            memo.text = newText;
            saveLists();
            renderLists();
        }
    }
}

// 메모 편집 취소
function cancelMemoEdit(memoId, originalText) {
    const memoElement = document.querySelector(`.memo-item[data-memo-id="${memoId}"]`);
    if (!memoElement) return;

    const editContainer = memoElement.querySelector('.edit-container');
    if (!editContainer) return;

    // 원래 텍스트로 복원
    const memoText = document.createElement('span');
    memoText.className = 'memo-text';
    memoText.textContent = originalText;
    
    editContainer.parentNode.replaceChild(memoText, editContainer);
}

// 페이지 로드 시 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', function() {
    loadLists();
    
    // 검색 입력 필드에 이벤트 리스너 추가
    document.getElementById('searchInput').addEventListener('input', function() {
        const query = this.value.trim();
        if (query) {
            searchLists(query);
        } else {
            document.getElementById('searchResults').innerHTML = '';
            selectedIndex = -1;
        }
    });
    
    // 키보드 이벤트 처리
    document.getElementById('searchInput').addEventListener('keydown', function(e) {
        const searchResults = document.getElementById('searchResults');
        const items = searchResults.querySelectorAll('.list-item');
        
        if (items.length === 0) return;
        
        switch(e.key) {
            case 'Tab':
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateSelectedItem(items);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateSelectedItem(items);
                break;
                
            case ' ':
                const selectedItem = searchResults.querySelector('.list-item.selected');
                if (selectedItem) {
                    e.preventDefault();
                    const word = selectedItem.getAttribute('data-word');
                    selectWord(word);
                }
                break;
        }
    });
    
    // Enter 키 이벤트 처리
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addNewList();
        }
    });
    
    // 추가 버튼 이벤트 리스너
    document.getElementById('addListBtn').addEventListener('click', addNewList);
    
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