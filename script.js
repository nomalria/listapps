// 전역 변수
let lists = [];
let currentListId = null;

// 삭제 확인을 위한 타이머 객체
const deleteTimers = {};

// 현재 선택된 추천문구 인덱스
let selectedIndex = -1;

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
        // JSON 문자열을 UTF-8로 인코딩
        const jsonString = JSON.stringify(lists, null, 2);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(jsonString);
        const base64Content = btoa(String.fromCharCode.apply(null, bytes));
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update lists data',
                content: base64Content
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
            
            try {
                // JSON 파싱 시도
                lists = JSON.parse(content);
                saveLists();
                renderLists();
                alert('GitHub에서 데이터를 불러왔습니다.');
            } catch (parseError) {
                console.error('JSON 파싱 오류:', parseError);
                
                // 인코딩 문제 해결 시도
                const decoder = new TextDecoder('utf-8');
                const bytes = Uint8Array.from(atob(data.content), c => c.charCodeAt(0));
                const decodedContent = decoder.decode(bytes);
                
                try {
                    lists = JSON.parse(decodedContent);
                    saveLists();
                    renderLists();
                    alert('GitHub에서 데이터를 불러왔습니다.');
                } catch (secondError) {
                    console.error('두 번째 파싱 시도 실패:', secondError);
                    alert('데이터를 불러오는 중 오류가 발생했습니다. 인코딩 문제일 수 있습니다.');
                }
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
    // 방덱 목록 정렬
    lists.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    
    // 각 방덱의 메모 정렬
    lists.forEach(list => {
        list.memos.sort((a, b) => a.text.localeCompare(b.text, 'ko'));
    });
    
    saveLists();
    renderLists();
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