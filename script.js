// 전역 변수
let lists = [];
let temporaryLists = [];
let currentListId = null;
let currentFilterType = 'all'; // 현재 활성화된 필터 타입 ('all', '4방덱', '5방덱', '기타')

// 삭제 확인을 위한 타이머 객체
const deleteTimers = {};

// 현재 선택된 추천문구 인덱스
let selectedIndex = -1;

// 전역 변수 추가
let editingListId = null;
let editingMemoId = null;

// 방덱 목록 불러오기 (메모 구조 변환 로직 추가)
function loadLists() {
    const savedLists = localStorage.getItem('lists');
    if (savedLists) {
        try {
            const parsedLists = JSON.parse(savedLists);
            // 메모 구조 변환 (문자열 -> 객체)
            lists = parsedLists.map(list => ({
                ...list,
                memos: (list.memos || []).map(memo => {
                    if (typeof memo === 'string') {
                        let text = memo;
                        let status = null;
                        if (text.includes('공격성공')) {
                            status = 'success';
                            text = text.replace(/\s*\/?\/?\s*공격성공.*/, '').trim(); // 관련 텍스트 제거
                        } else if (text.includes('공격실패')) {
                            status = 'fail';
                            text = text.replace(/\s*\/?\/?\s*공격실패.*/, '').trim(); // 관련 텍스트 제거
                        }
                        // 이전 ID가 없을 수 있으므로 새로 생성
                        return { id: Date.now().toString() + Math.random().toString(16).slice(2), text, status };
                    } else if (typeof memo === 'object' && memo !== null) {
                        // 이미 객체 형태인 경우, status 필드가 없으면 추가
                        return { ...memo, status: memo.status !== undefined ? memo.status : null };
                    } else {
                        // 유효하지 않은 메모 형태는 일단 null 반환 (혹은 빈 객체)
                        return null;
                    }
                }).filter(memo => memo !== null) // 유효하지 않은 메모 제거
            }));
            console.log('로드 및 변환된 기존 목록:', lists);
            saveLists(); // 변환된 구조 즉시 저장
        } catch (e) {
            console.error("기존 목록 로딩/파싱 오류:", e);
            localStorage.removeItem('lists'); // 오류 발생 시 손상된 데이터 제거
            lists = [];
        }
    }

    const savedTemporaryLists = localStorage.getItem('temporaryLists');
    if (savedTemporaryLists) {
        try {
            const parsedTempLists = JSON.parse(savedTemporaryLists);
            // 임시 목록 메모 구조 변환
            temporaryLists = parsedTempLists.map(list => ({
                ...list,
                memos: (list.memos || []).map(memo => {
                     if (typeof memo === 'string') {
                        let text = memo;
                        let status = null;
                         if (text.includes('공격성공')) {
                            status = 'success';
                            text = text.replace(/\s*\/?\/?\s*공격성공.*/, '').trim();
                        } else if (text.includes('공격실패')) {
                            status = 'fail';
                            text = text.replace(/\s*\/?\/?\s*공격실패.*/, '').trim();
                        }
                        return { id: Date.now().toString() + Math.random().toString(16).slice(2), text, status };
                    } else if (typeof memo === 'object' && memo !== null) {
                        return { ...memo, status: memo.status !== undefined ? memo.status : null };
                    } else {
                         return null;
                    }
                }).filter(memo => memo !== null)
            }));
            console.log('로드 및 변환된 임시 목록:', temporaryLists);
            saveTemporaryLists(); // 변환된 구조 즉시 저장
        } catch (e) {
            console.error("임시 목록 로딩/파싱 오류:", e);
            localStorage.removeItem('temporaryLists');
            temporaryLists = [];
        }
    }
    renderLists();
    renderTemporaryLists();
    updateStats();
}

// 방덱 목록 저장
function saveLists() {
    localStorage.setItem('lists', JSON.stringify(lists));
    updateStats();
}

// 임시 방덱 목록 저장 함수 추가
function saveTemporaryLists() {
    localStorage.setItem('temporaryLists', JSON.stringify(temporaryLists));
    // 임시 목록 변경 시 통계는 updateStats()에서 lists 기준으로 계산되므로 여기서는 호출 불필요
    // 필요하다면 임시 목록 개수를 표시하는 별도 UI 업데이트 로직 추가 가능
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
                memos: []
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
                memos: []
            };
            temporaryLists.unshift(newList);
            renderTemporaryLists();
        }
    }
    
    searchInput.value = '';
    updateStats();
    saveTemporaryLists(); // 임시 목록 변경 후 저장
    saveLists(); // 기존 목록이 변경되었을 수도 있으므로 저장
}

// 임시 목록 렌더링 (상태 아이콘 및 버튼 추가)
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
                    ${(list.memos || []).map(memo => `
                        <div class="memo-item" data-memo-id="${memo.id}">
                            <span class="memo-status-icon ${memo.status || 'unknown'}">
                                ${memo.status === 'success' ? '✅' : memo.status === 'fail' ? '❌' : ''}
                            </span>
                            <span class="memo-text">${memo.text}</span>
                            <div class="memo-buttons">
                                <button class="status-btn success-btn ${memo.status === 'success' ? 'active' : ''}" onclick="setMemoStatus('${list.id}', '${memo.id}', 'success', true)" title="성공">✅</button>
                                <button class="status-btn fail-btn ${memo.status === 'fail' ? 'active' : ''}" onclick="setMemoStatus('${list.id}', '${memo.id}', 'fail', true)" title="실패">❌</button>
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
            updateStats(); // 통계는 기존 목록 기준이므로 업데이트 필요 없음
            saveTemporaryLists(); // 임시 목록 변경 후 저장
        } else {
            // 기존 목록에서 삭제
            lists = lists.filter(list => list.id.toString() !== listId.toString());
            saveLists();
            renderLists();
            updateStats();
        }
    }
}

// 메모 추가 (키워드 기반 자동 상태 설정 및 텍스트 정리)
function addMemo(listId, isTemporary = false) {
    const memoInput = document.getElementById(`newMemoInput-${listId}`);
    let memoText = memoInput.value.trim(); // let으로 변경하여 수정 가능하게 함
    let initialStatus = null; // 메모의 초기 상태
    
    if (memoText) {
        // 1. 키워드 확인 및 상태 설정, 텍스트 정리 (메모 추가 시에만 동작)
        const successKeywords = ["공성", "공격성공"];
        const failKeywords = ["공실", "공격실패"];
        let statusSet = false;

        for (const keyword of successKeywords) {
            const regex = new RegExp(`\\s*(\/\/)?\\s*${keyword}\\b.*`, 'i'); // 키워드 및 뒤 내용 제거 정규식 (기존 로직 참고)
            if (memoText.includes(keyword)) { 
                initialStatus = 'success';
                memoText = memoText.replace(regex, '').trim(); // 키워드 및 관련 내용 제거
                statusSet = true;
                break; // 성공 키워드 찾으면 중단
            }
        }

        if (!statusSet) { // 성공 키워드가 없었을 경우 실패 키워드 확인
            for (const keyword of failKeywords) {
                const regex = new RegExp(`\\s*(\/\/)?\\s*${keyword}\\b.*`, 'i');
                if (memoText.includes(keyword)) {
                    initialStatus = 'fail';
                    memoText = memoText.replace(regex, '').trim();
                    break; // 실패 키워드 찾으면 중단
                }
            }
        }
        
        // 키워드 제거 후 텍스트가 비었는지 확인 (선택적)
        if (!memoText) {
             alert("키워드 제거 후 메모 내용이 없습니다.");
             return;
        }

        const targetLists = isTemporary ? temporaryLists : lists;
        const list = targetLists.find(l => l.id.toString() === listId.toString());
        if (list) {
            if (list.memos.length >= 50) {
                alert('한 방덱에는 최대 50개의 메모만 추가할 수 있습니다.');
                return;
            }
            // 2. 새 메모 객체 생성 (정리된 텍스트와 결정된 상태 사용)
            const newMemo = {
                id: Date.now().toString() + Math.random().toString(16).slice(2),
                text: memoText,       // 키워드가 제거된 텍스트
                status: initialStatus // 자동으로 결정된 상태 (또는 null)
            };
            list.memos.push(newMemo);
            
            // 3. 데이터 저장
            if (!isTemporary) {
                saveLists();
            } else {
                saveTemporaryLists();
            }

            // 4. UI 업데이트 (DOM 직접 조작)
            const memoListContainer = document.querySelector(`#memoSection-${listId} .memo-list`);
            if (memoListContainer) {
                // 새 메모 항목 HTML 생성 (status 반영)
                const memoItemHTML = `
                    <div class="memo-item" data-memo-id="${newMemo.id}">
                        <span class="memo-status-icon ${newMemo.status || 'unknown'}">
                            ${newMemo.status === 'success' ? '✅' : newMemo.status === 'fail' ? '❌' : ''}
                        </span>
                        <span class="memo-text">${newMemo.text}</span>
                        <div class="memo-buttons">
                             <button class="status-btn success-btn ${newMemo.status === 'success' ? 'active' : ''}" onclick="setMemoStatus('${listId}', '${newMemo.id}', 'success', ${isTemporary})" title="성공">✅</button>
                             <button class="status-btn fail-btn ${newMemo.status === 'fail' ? 'active' : ''}" onclick="setMemoStatus('${listId}', '${newMemo.id}', 'fail', ${isTemporary})" title="실패">❌</button>
                            <button class="edit-btn" onclick="startEditMemo('${listId}', '${newMemo.id}', ${isTemporary})">편집</button>
                            <button class="delete-btn" onclick="deleteMemo('${listId}', '${newMemo.id}', ${isTemporary})">삭제</button>
                        </div>
                        <div class="edit-section" id="editMemoSection-${newMemo.id}">
                            <div class="input-group">
                                <input type="text" id="editMemoInput-${newMemo.id}" placeholder="메모 내용 수정..." onkeypress="if(event.key === 'Enter') saveMemoEdit('${listId}', '${newMemo.id}', ${isTemporary})">
                                <div class="edit-buttons">
                                    <button class="save-btn" onclick="saveMemoEdit('${listId}', '${newMemo.id}', ${isTemporary})">저장</button>
                                    <button class="cancel-btn" onclick="cancelMemoEdit('${listId}', '${newMemo.id}', ${isTemporary})">취소</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                memoListContainer.insertAdjacentHTML('beforeend', memoItemHTML);
            } else {
                 console.warn("Memo list container not found for direct update, falling back to full render.");
                 isTemporary ? renderTemporaryLists() : renderLists();
            }

            // 5. 메모 카운트 업데이트
            const memoCountElement = document.querySelector(`.list-item[data-list-id="${listId}"] .memo-count`);
            if (memoCountElement) {
                memoCountElement.textContent = `${list.memos.length}/50`;
            }
            
            // 6. 입력 필드 비우기
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
            } else {
                saveTemporaryLists(); // 임시 목록 메모 삭제 후 저장
            }
            isTemporary ? renderTemporaryLists() : renderLists();
        }
    }
}

// 방덱 목록 렌더링 (상태 아이콘 및 버튼 추가)
function renderLists() {
    const listsContainer = document.getElementById('lists');
    
    // 현재 필터 타입에 따라 목록 필터링
    let filteredLists = lists;
    if (currentFilterType === '4방덱') {
        filteredLists = lists.filter(list => list.title.startsWith('4방덱'));
    } else if (currentFilterType === '5방덱') {
        filteredLists = lists.filter(list => list.title.startsWith('5방덱'));
    } else if (currentFilterType === '기타') {
        filteredLists = lists.filter(list => !list.title.startsWith('4방덱') && !list.title.startsWith('5방덱'));
    } // 'all'일 경우 모든 목록 표시 (기본값)

    listsContainer.innerHTML = filteredLists.map(list => `
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
                    ${(list.memos || []).map(memo => `
                        <div class="memo-item" data-memo-id="${memo.id}">
                            <span class="memo-status-icon ${memo.status || 'unknown'}">
                                ${memo.status === 'success' ? '✅' : memo.status === 'fail' ? '❌' : ''}
                            </span>
                            <span class="memo-text">${memo.text}</span>
                            <div class="memo-buttons">
                                <button class="status-btn success-btn ${memo.status === 'success' ? 'active' : ''}" onclick="setMemoStatus('${list.id}', '${memo.id}', 'success', false)" title="성공">✅</button>
                                <button class="status-btn fail-btn ${memo.status === 'fail' ? 'active' : ''}" onclick="setMemoStatus('${list.id}', '${memo.id}', 'fail', false)" title="실패">❌</button>
                                <button class="edit-btn" onclick="startEditMemo('${list.id}', '${memo.id}', false)">편집</button>
                                <button class="delete-btn" onclick="deleteMemo('${list.id}', '${memo.id}', false)">삭제</button>
                            </div>
                            <div class="edit-section" id="editMemoSection-${memo.id}">
                                <div class="input-group">
                                    <input type="text" id="editMemoInput-${memo.id}" placeholder="메모 내용 수정..." onkeypress="if(event.key === 'Enter') saveMemoEdit('${list.id}', '${memo.id}', false)">
                                    <div class="edit-buttons">
                                        <button class="save-btn" onclick="saveMemoEdit('${list.id}', '${memo.id}', false)">저장</button>
                                        <button class="cancel-btn" onclick="cancelMemoEdit('${list.id}', '${memo.id}', false)">취소</button>
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
        if (!isTemporary) {
            saveLists();
        } else {
            saveTemporaryLists(); // 임시 목록 제목 수정 후 저장
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

// 메모 편집 시작 (텍스트만 로드)
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
        input.value = memo.text; // status 제외하고 text만 설정
        input.focus();
        input.select();
    }

    editSection.style.display = 'block';
    editingMemoId = memoId;
}

// 메모 편집 저장 (텍스트만 저장)
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
            memo.text = newText; // text만 업데이트
            // status는 여기서 변경하지 않음 (별도 버튼으로 처리)
            if (!isTemporary) {
                saveLists();
            } else {
                saveTemporaryLists();
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

// 목록 및 메모 정렬 (중복 덮어쓰기 로직 추가)
function sortAll() {
    // 1. 임시 목록의 제목을 키로 하는 맵 생성 (덮어쓰기 확인용)
    const tempMap = new Map();
    temporaryLists.forEach(item => tempMap.set(item.title, item));

    // 2. 기존 목록에서 임시 목록과 중복되는 항목 제거
    lists = lists.filter(list => !tempMap.has(list.title));

    // 3. 필터링된 기존 목록과 임시 목록 병합
    lists = [...lists, ...temporaryLists];
    
    // 4. 단어 순으로 목록 정렬
    lists.sort((a, b) => {
        const wordsA = a.title.split(' ');
        const wordsB = b.title.split(' ');
        // 제목의 첫 두 단어를 기준으로 정렬
        const compareResult = wordsA[0].localeCompare(wordsB[0]) || wordsA[1].localeCompare(wordsB[1]);
        if (compareResult !== 0) {
            return compareResult;
        }
        // 제목이 같으면 ID를 기준으로 정렬 (안정 정렬 보장)
        return a.id.toString().localeCompare(b.id.toString());
    });

    // 5. 각 목록 내 메모를 텍스트 순으로 정렬
    lists.forEach(list => {
        if (list.memos && list.memos.length > 1) {
            list.memos.sort((memoA, memoB) => {
                return memoA.text.localeCompare(memoB.text);
            });
        }
    });
    
    // 6. 임시 목록 비우기
    temporaryLists = [];
    
    // 7. 목록 저장 및 렌더링
    saveLists(); // 병합된 기존 목록 저장
    saveTemporaryLists(); // 비워진 임시 목록 상태 저장
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

    // 통계 항목 클릭 이벤트 리스너 추가
    document.querySelectorAll('.stats-section .stat-item').forEach(item => {
        item.addEventListener('click', function() {
            currentFilterType = this.dataset.filterType;
            console.log('Filter changed to:', currentFilterType);
            
            // 모든 항목에서 'selected' 클래스 제거
            document.querySelectorAll('.stats-section .stat-item').forEach(el => el.classList.remove('selected'));
            // 클릭된 항목에 'selected' 클래스 추가
            this.classList.add('selected');
            
            renderLists(); // 필터링된 목록 다시 렌더링
        });
    });

    // 초기에 '전체 보기'를 선택된 상태로 설정
    document.getElementById('stat-item-all')?.classList.add('selected');

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

// GitHub에 업로드 (조건부 로직 추가)
async function uploadToGithub() {
    const token = localStorage.getItem('github_token');
    if (!token) {
        alert('GitHub에 로그인해주세요.');
        return;
    }

    let uploadEndpoint = '';
    let dataToUpload = {};
    let successMessage = '';

    if (temporaryLists.length > 0) {
        // 임시 목록이 있을 경우: 변경사항만 업로드
        uploadEndpoint = '/api/upload_changes'; // *** 백엔드 엔드포인트 (변경사항용) ***
        dataToUpload = { temporaryLists: temporaryLists };
        successMessage = '변경사항이 GitHub에 성공적으로 업로드되었습니다.';
        console.log('Uploading changes:', temporaryLists);
    } else {
        // 임시 목록이 없을 경우: 기존 목록 전체 업로드
        uploadEndpoint = '/api/upload_main'; // *** 백엔드 엔드포인트 (전체 목록용) ***
        dataToUpload = { lists: lists }; 
        successMessage = '기존 목록 전체가 GitHub에 성공적으로 업로드되었습니다.';
        console.log('Uploading main list:', lists);
    }

    try {
        const response = await fetch(uploadEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dataToUpload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // 오류 응답 파싱 시도
            throw new Error(`업로드 실패: ${response.status} ${response.statusText} ${errorData.message || ''}`.trim());
        }

        // 변경사항 업로드 성공 시 임시 목록 비우기 (선택사항)
        if (dataToUpload.temporaryLists && temporaryLists.length > 0) { // temporaryLists를 보냈는지 확인
             temporaryLists = [];
             renderTemporaryLists();
             saveTemporaryLists(); // 비워진 임시 목록 상태 저장
        }

        alert(successMessage);

    } catch (error) {
        console.error('GitHub 업로드 오류:', error);
        alert(`GitHub 업로드 중 오류가 발생했습니다: ${error.message}`);
    }
}

// GitHub에서 변경사항만 불러오기
async function loadChangesFromGithub() {
    const token = localStorage.getItem('github_token');
    if (!token) {
        alert('GitHub에 로그인해주세요.');
        return;
    }

    if (!confirm('GitHub에 저장된 변경사항만 불러오겠습니까? 현재 임시 목록은 덮어쓰여집니다.')) {
        return;
    }

    try {
        const response = await fetch('/api/download_changes', { // *** 백엔드 엔드포인트 (변경사항 다운로드) ***
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`다운로드 실패: ${response.status} ${response.statusText} ${errorData.message || ''}`.trim());
        }

        const data = await response.json(); 
        temporaryLists = data.temporaryLists || []; 
        saveTemporaryLists(); // 불러온 임시 목록 상태 저장
        renderTemporaryLists(); 
        alert('GitHub에서 변경사항을 성공적으로 불러왔습니다.');

    } catch (error) {
        console.error('GitHub 변경사항 다운로드 오류:', error);
        alert(`GitHub 변경사항 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
}

// GitHub에서 전체 데이터 불러오기
async function loadAllFromGithub() {
    const token = localStorage.getItem('github_token');
    if (!token) {
        alert('GitHub에 로그인해주세요.');
        return;
    }

    if (!confirm('GitHub에 저장된 전체 목록을 불러오겠습니까? 현재 모든 로컬 데이터는 덮어쓰여집니다.')) {
        return;
    }

    try {
        const response = await fetch('/api/download_all', { // *** 백엔드 엔드포인트 (전체 다운로드) ***
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`다운로드 실패: ${response.status} ${response.statusText} ${errorData.message || ''}`.trim());
        }

        const data = await response.json();
        // 서버가 { lists: [...], temporaryLists: [...] } 형태로 응답한다고 가정
        lists = data.lists || [];
        temporaryLists = data.temporaryLists || [];
        
        saveLists(); // 불러온 기존 목록 저장
        saveTemporaryLists(); // 불러온 임시 목록 저장
        renderLists();
        renderTemporaryLists();
        updateStats();
        
        alert('GitHub에서 전체 목록을 성공적으로 불러왔습니다.');

    } catch (error) {
        console.error('GitHub 전체 다운로드 오류:', error);
        alert(`GitHub 전체 목록 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
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

// 메모 상태 설정 함수 (UI 부분 업데이트로 수정)
function setMemoStatus(listId, memoId, newStatus, isTemporary = false) {
    const targetLists = isTemporary ? temporaryLists : lists;
    const list = targetLists.find(l => l.id.toString() === listId.toString());
    if (list) {
        const memo = list.memos.find(m => m.id.toString() === memoId.toString());
        if (memo) {
            // 1. 상태 업데이트 (토글 기능 포함)
            const previousStatus = memo.status;
            memo.status = previousStatus === newStatus ? null : newStatus;

            // 2. 데이터 저장 (기존과 동일)
            if (!isTemporary) {
                saveLists();
            } else {
                saveTemporaryLists();
            }

            // 3. UI 즉시 업데이트 (DOM 직접 조작)
            const memoElement = document.querySelector(`.list-item[data-list-id="${listId}"] .memo-item[data-memo-id="${memoId}"]`);
            if (memoElement) {
                // 아이콘 업데이트
                const iconElement = memoElement.querySelector('.memo-status-icon');
                if (iconElement) {
                    iconElement.textContent = memo.status === 'success' ? '✅' : memo.status === 'fail' ? '❌' : '';
                    // 클래스 업데이트 (unknown 클래스는 상태 없을 때)
                    iconElement.className = `memo-status-icon ${memo.status || 'unknown'}`;
                }

                // 성공 버튼 활성/비활성 업데이트
                const successBtn = memoElement.querySelector('.success-btn');
                if (successBtn) {
                    if (memo.status === 'success') {
                        successBtn.classList.add('active');
                    } else {
                        successBtn.classList.remove('active');
                    }
                }

                // 실패 버튼 활성/비활성 업데이트
                const failBtn = memoElement.querySelector('.fail-btn');
                if (failBtn) {
                    if (memo.status === 'fail') {
                        failBtn.classList.add('active');
                    } else {
                        failBtn.classList.remove('active');
                    }
                }
            } else {
                 // 만약 DOM 요소를 못찾으면 전체 렌더링 (안전 장치)
                 console.warn("Memo element not found for direct update, falling back to full render.");
                 isTemporary ? renderTemporaryLists() : renderLists();
            }

            console.log(`Memo ${memoId} status set to ${memo.status}`);
        } else {
            console.error('메모를 찾을 수 없습니다:', memoId);
        }
    } else {
        console.error('방덱을 찾을 수 없습니다:', listId);
    }
}

// 백틱 키로 열린 메모 섹션 닫기
document.addEventListener('keydown', function(event) {
    // 입력 필드(input, textarea)에 포커스가 있을 때는 작동하지 않음
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
    }

    if (event.key === '`') { // 백틱 키 확인
        console.log('Backtick key pressed');
        // 현재 열려있는 메모 섹션을 찾음
        const expandedMemoSection = document.querySelector('.memo-section.expanded');
        
        if (expandedMemoSection) {
            // 해당 메모 섹션의 부모 list-item에서 listId를 가져옴
            const listItem = expandedMemoSection.closest('.list-item');
            if (listItem) {
                const listId = listItem.dataset.listId;
                console.log(`Closing memo section for list ID: ${listId}`);
                toggleMemos(listId); // 기존 토글 함수를 사용하여 닫음
            }
        }
    }
}); 