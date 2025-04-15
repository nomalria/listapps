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

// 변경사항 추적을 위한 전역 변수 추가
let lastSyncedLists = [];
let lastSyncTime = null;

// 방덱 목록 불러오기
function loadLists() {
    const savedLists = localStorage.getItem('lists');
    if (savedLists) {
        lists = JSON.parse(savedLists);
        console.log('로드된 목록:', lists);
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

    console.log('검색어:', query);
    console.log('전체 목록:', lists);

    // 현재 입력된 단어들을 가져옴
    const currentWords = query.split(' ').filter(w => w);
    const lastWord = currentWords[currentWords.length - 1];

    // 모든 방덱의 단어들을 추출
    const allWords = new Set();
    lists.forEach(list => {
        const words = list.title.split(' ');
        words.forEach(word => {
            const trimmedWord = word.trim();
            if (trimmedWord) {
                allWords.add(trimmedWord);
            }
        });
    });

    console.log('추출된 단어들:', Array.from(allWords));

    // 검색어와 일치하는 단어들 찾기 (마지막 단어와 일치하는 것만)
    const matchingWords = Array.from(allWords).filter(word => {
        const matches = word.toLowerCase().includes(lastWord.toLowerCase()) &&
                       !currentWords.includes(word);
        console.log(`단어 "${word}" 검색 결과:`, matches);
        return matches;
    });

    console.log('매칭된 단어들:', matchingWords);

    if (matchingWords.length > 0) {
        searchResults.innerHTML = matchingWords.map((word, index) => `
            <div class="list-item ${index === selectedIndex ? 'selected' : ''}" 
                 data-word="${word}" 
                 data-index="${index}"
                 onclick="selectWord('${word}')">
                <span>${word}</span>
            </div>
        `).join('');
        
        if (selectedIndex === -1 && matchingWords.length > 0) {
            selectedIndex = 0;
            updateSelectedItem(searchResults.getElementsByClassName('list-item'));
        }
    } else {
        searchResults.innerHTML = '';
        selectedIndex = -1;
    }
}

// 단어 선택 시 검색창에 추가
function selectWord(word) {
    const searchInput = document.getElementById('searchInput');
    const currentWords = searchInput.value.trim().split(' ');
    
    // 마지막 단어를 선택한 단어로 대체
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
    
    // 입력된 단어 개수 확인
    const words = title.split(' ').filter(w => w);
    
    if (words.length <= 3) {
        // 3개 이하의 단어 입력 시
        // 입력된 모든 단어가 포함된 목록들을 찾아서 임시목록으로 옮김
        const matchingLists = lists.filter(list => {
            const listWords = list.title.split(' ').filter(w => w);
            return words.every(word => 
                listWords.some(listWord => 
                    listWord.toLowerCase().includes(word.toLowerCase())
                )
            );
        });
        
        if (matchingLists.length > 0) {
            // 매칭되는 목록들을 기존 목록에서 제거하고 임시목록에 추가
            lists = lists.filter(list => !matchingLists.includes(list));
            temporaryLists = [...matchingLists, ...temporaryLists];
            saveLists();
            renderLists();
            renderTemporaryLists();
        } else {
            // 매칭되는 목록이 없으면 새로 임시목록에 추가
            const newList = {
                id: Date.now().toString(),
                title: title,
                memos: [],
                lastModified: new Date().toISOString()
            };
            temporaryLists.unshift(newList);
            renderTemporaryLists();
        }
    } else {
        // 4개 이상의 단어 입력 시
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
                memos: [],
                lastModified: new Date().toISOString()
            };
            temporaryLists.unshift(newList);
            renderTemporaryLists();
        }
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
            const newMemo = {
                id: Date.now().toString(),
                text: memoText,
                lastModified: new Date().toISOString()
            };
            list.memos.push(newMemo);
            list.lastModified = new Date().toISOString();
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
            list.lastModified = new Date().toISOString();
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
    
    document.getElementById('stat-4').textContent = stats['4deck'];
    document.getElementById('stat-5').textContent = stats['5deck'];
    document.getElementById('stat-other').textContent = stats['other'];
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
        list.lastModified = new Date().toISOString();
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
            memo.lastModified = new Date().toISOString();
            list.lastModified = new Date().toISOString();
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

// 페이지 로드 시 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', async function() {
    // 초기 데이터 로드
    loadLists();
    
    // 검색 입력 필드에 이벤트 리스너 추가
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query) {
                searchLists(query);
            } else {
                document.getElementById('searchResults').innerHTML = '';
                selectedIndex = -1;
            }
        });

        // 키보드 이벤트 처리
        searchInput.addEventListener('keydown', function(e) {
            const searchResults = document.getElementById('searchResults');
            const items = searchResults.getElementsByClassName('list-item');
            
            if (items.length === 0) return;
            
            switch(e.key) {
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
                case 'Tab':
                    e.preventDefault();
                    if (e.shiftKey) {
                        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                    } else {
                        selectedIndex = (selectedIndex + 1) % items.length;
                    }
                    updateSelectedItem(items);
                    break;
                case ' ':
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < items.length) {
                        const word = items[selectedIndex].dataset.word;
                        // 현재 입력된 마지막 단어를 선택한 단어로 대체
                        const currentWords = this.value.trim().split(' ');
                        currentWords[currentWords.length - 1] = word;
                        this.value = currentWords.join(' ');
                        searchResults.innerHTML = '';
                        selectedIndex = -1;
                    }
                    break;
                case 'Escape':
                    searchResults.innerHTML = '';
                    selectedIndex = -1;
                    break;
            }
        });
    }
    
    // 추가 버튼 이벤트 리스너
    const addListBtn = document.getElementById('addListBtn');
    if (addListBtn) {
        addListBtn.addEventListener('click', addNewList);
    }
    
    // 정렬 버튼 이벤트 리스너
    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) {
        sortBtn.addEventListener('click', sortAll);
    }

    // GitHub 버튼 이벤트 리스너
    const uploadGithubBtn = document.getElementById('uploadGithubBtn');
    if (uploadGithubBtn) {
        uploadGithubBtn.addEventListener('click', uploadToGithub);
    }

    const loadGithubBtn = document.getElementById('loadGithubBtn');
    if (loadGithubBtn) {
        loadGithubBtn.addEventListener('click', loadFromGithub);
    }

    // GitHub 로그인 상태 확인
    checkGitHubLoginStatus();
});

// 선택된 항목 업데이트
function updateSelectedItem(items) {
    Array.from(items).forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('selected');
        }
    });
}

// 변경사항 감지 함수
function detectChanges(currentLists = lists) {
    const changes = {
        modified: [],
        added: [],
        deleted: [],
        timestamp: new Date().toISOString()
    };

    // 수정된 목록 찾기
    currentLists.forEach(list => {
        const oldList = lastSyncedLists.find(l => l.id === list.id);
        if (oldList && !isEqual(list, oldList)) {
            changes.modified.push({
                id: list.id,
                changes: getChangedFields(list, oldList)
            });
        }
    });

    // 새로 추가된 목록 찾기
    changes.added = currentLists.filter(list => 
        !lastSyncedLists.some(l => l.id === list.id)
    );

    // 삭제된 목록 찾기
    changes.deleted = lastSyncedLists
        .filter(list => !currentLists.some(l => l.id === list.id))
        .map(list => list.id);

    return changes;
}

// 변경된 필드만 추출
function getChangedFields(newList, oldList) {
    const changes = {};
    
    if (newList.title !== oldList.title) {
        changes.title = newList.title;
    }
    
    const memoChanges = {
        added: [],
        deleted: [],
        modified: []
    };

    // 새 메모 찾기
    newList.memos.forEach(newMemo => {
        if (!oldList.memos.some(oldMemo => oldMemo.id === newMemo.id)) {
            memoChanges.added.push(newMemo);
        }
    });

    // 삭제된 메모 찾기
    oldList.memos.forEach(oldMemo => {
        if (!newList.memos.some(newMemo => newMemo.id === oldMemo.id)) {
            memoChanges.deleted.push(oldMemo.id);
        }
    });

    // 수정된 메모 찾기
    newList.memos.forEach(newMemo => {
        const oldMemo = oldList.memos.find(m => m.id === newMemo.id);
        if (oldMemo && !isEqual(newMemo, oldMemo)) {
            memoChanges.modified.push(newMemo);
        }
    });

    if (Object.keys(memoChanges).length > 0) {
        changes.memos = memoChanges;
    }

    return changes;
}

// 두 객체 비교 함수
function isEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// 변경사항 적용 함수
function applyChanges(lists, changes) {
    let updatedLists = [...lists];

    // 삭제된 목록 제거
    updatedLists = updatedLists.filter(list => !changes.deleted.includes(list.id));

    // 수정된 목록 업데이트
    changes.modified.forEach(mod => {
        const index = updatedLists.findIndex(l => l.id === mod.id);
        if (index !== -1) {
            updatedLists[index] = applyModifications(updatedLists[index], mod.changes);
        }
    });

    // 새 목록 추가
    updatedLists.push(...changes.added);

    return updatedLists;
}

// 수정사항 적용
function applyModifications(list, changes) {
    const updatedList = { ...list };

    if (changes.title) {
        updatedList.title = changes.title;
    }

    if (changes.memos) {
        const { added, deleted, modified } = changes.memos;

        // 삭제된 메모 제거
        updatedList.memos = updatedList.memos.filter(memo => !deleted.includes(memo.id));

        // 수정된 메모 업데이트
        modified.forEach(modifiedMemo => {
            const index = updatedList.memos.findIndex(m => m.id === modifiedMemo.id);
            if (index !== -1) {
                updatedList.memos[index] = modifiedMemo;
            }
        });

        // 새 메모 추가
        updatedList.memos.push(...added);
    }

    return updatedList;
}

// GitHub 업로드 함수 수정
async function uploadToGithub() {
    try {
        const token = localStorage.getItem('github_token');
        if (!token) {
            alert('GitHub 토큰이 없습니다. 먼저 로그인해주세요.');
            return;
        }

        // temporaryLists를 lists에 병합
        const mergedLists = [...lists];
        temporaryLists.forEach(tempList => {
            const existingIndex = mergedLists.findIndex(l => l.id === tempList.id);
            if (existingIndex === -1) {
                mergedLists.push(tempList);
            } else {
                mergedLists[existingIndex] = tempList;
            }
        });

        // 변경사항 감지 (병합된 lists 기준)
        const changes = detectChanges(mergedLists);
        
        if (Object.keys(changes).length === 0) {
            alert('변경된 내용이 없습니다.');
            return;
        }

        // 현재 GitHub의 lists.json 가져오기
        const response = await fetch('https://api.github.com/repos/nomalria/listapps/contents/lists.json', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('GitHub 파일을 가져오는데 실패했습니다.');
        }

        const fileData = await response.json();
        const currentLists = JSON.parse(atob(fileData.content));
        
        // 변경사항 적용
        const updatedLists = applyChanges(currentLists, changes);
        
        // 업데이트된 파일 업로드
        const updateResponse = await fetch('https://api.github.com/repos/nomalria/listapps/contents/lists.json', {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update lists.json with changes',
                content: btoa(JSON.stringify(updatedLists)),
                sha: fileData.sha
            })
        });

        if (!updateResponse.ok) {
            throw new Error('GitHub 파일 업데이트에 실패했습니다.');
        }

        // 마지막 동기화 상태 업데이트
        lastSyncedLists = [...mergedLists];
        lastSyncTime = new Date().toISOString();
        
        // temporaryLists 초기화
        temporaryLists = [];
        renderTemporaryLists();
        
        alert('변경사항이 성공적으로 업로드되었습니다.');
    } catch (error) {
        console.error('GitHub 업로드 오류:', error);
        alert('GitHub 업로드 중 오류가 발생했습니다: ' + error.message);
    }
}

// GitHub에서 불러오기
async function loadFromGithub() {
    try {
        const token = localStorage.getItem('github_token');
        if (!token) {
            alert('GitHub 토큰이 없습니다. 먼저 로그인해주세요.');
            return;
        }

        // GitHub에서 lists.json 가져오기
        const response = await fetch('https://api.github.com/repos/nomalria/listapps/contents/lists.json', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('GitHub 파일을 가져오는데 실패했습니다.');
        }

        const fileData = await response.json();
        const githubLists = JSON.parse(atob(fileData.content));

        // 현재 데이터와 GitHub 데이터 병합
        const mergedLists = mergeLists([...lists, ...temporaryLists], githubLists);

        // 병합된 데이터로 업데이트
        lists = mergedLists;
        temporaryLists = [];  // temporaryLists 초기화
        lastSyncedLists = [...lists];
        lastSyncTime = new Date().toISOString();

        // UI 업데이트
        renderLists();
        renderTemporaryLists();
        updateStats();
        
        alert('GitHub에서 데이터를 성공적으로 불러왔습니다.');
    } catch (error) {
        console.error('GitHub 불러오기 오류:', error);
        alert('GitHub에서 데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 데이터 병합 함수
function mergeLists(currentLists, githubLists) {
    const merged = [...githubLists];

    // 현재 클라이언트의 데이터와 비교하여 병합
    currentLists.forEach(currentList => {
        const existingIndex = merged.findIndex(g => g.id === currentList.id);
        
        if (existingIndex === -1) {
            // GitHub에 없는 새 목록 추가
            merged.push(currentList);
        } else {
            // 수정된 목록이 있다면 최신 버전으로 업데이트
            if (currentList.lastModified > merged[existingIndex].lastModified) {
                merged[existingIndex] = currentList;
            }
        }
    });

    return merged;
}

// GitHub 로그인 상태 확인 및 UI 업데이트
async function checkGitHubLoginStatus() {
    const token = localStorage.getItem('github_token');
    const loginBtn = document.getElementById('githubLoginBtn');
    const statusDiv = document.getElementById('githubStatus');
    const usernameSpan = document.getElementById('githubUsername');

    if (token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'User-Agent': 'Your-App-Name'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                loginBtn.style.display = 'none';
                statusDiv.style.display = 'flex';
                usernameSpan.textContent = userData.login;
            } else {
                throw new Error('GitHub API request failed');
            }
        } catch (error) {
            console.error('GitHub 사용자 정보 가져오기 실패:', error);
            handleGitHubLogout();
        }
    } else {
        loginBtn.style.display = 'flex';
        statusDiv.style.display = 'none';
    }
}

// GitHub 로그아웃
function handleGitHubLogout() {
    localStorage.removeItem('github_token');
    checkGitHubLoginStatus();
    alert('GitHub에서 로그아웃되었습니다.');
}

// GitHub 콜백 처리 후 로그인 상태 확인
async function handleGitHubCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const savedState = localStorage.getItem('github_state');

    if (code && state && state === savedState) {
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                throw new Error('GitHub 인증 실패');
            }

            const data = await response.json();
            localStorage.setItem('github_token', data.access_token);
            checkGitHubLoginStatus();
            window.location.href = GITHUB_REDIRECT_URI;
        } catch (error) {
            console.error('GitHub 인증 오류:', error);
            alert('GitHub 인증 중 오류가 발생했습니다.');
        }
    }
} 