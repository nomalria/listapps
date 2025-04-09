// 로컬 스토리지에서 데이터 로드
let lists = JSON.parse(localStorage.getItem('lists')) || [];

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    renderLists();
});

// 새 목록 추가
function addNewList() {
    const titleInput = document.getElementById('listTitle');
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
}

// 메모 추가
function addMemo(listId) {
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
}

// 목록 삭제
function deleteList(listId) {
    lists = lists.filter(list => list.id !== listId);
    saveLists();
    renderLists();
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

// 목록 렌더링
function renderLists() {
    const container = document.getElementById('listsContainer');
    container.innerHTML = '';
    
    lists.forEach(list => {
        const listElement = document.createElement('div');
        listElement.className = 'list-item';
        listElement.innerHTML = `
            <div class="list-title">
                ${list.title}
                <button onclick="deleteList(${list.id})">삭제</button>
            </div>
            <div class="memo-section">
                <input type="text" id="memo-input-${list.id}" class="memo-input" placeholder="새 메모 추가">
                <button onclick="addMemo(${list.id})">메모 추가</button>
                <ul class="memo-list">
                    ${list.memos.map(memo => `
                        <li class="memo-item">
                            ${memo.text}
                            <button onclick="deleteMemo(${list.id}, ${memo.id})">삭제</button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        container.appendChild(listElement);
    });
}

// 로컬 스토리지에 저장
function saveLists() {
    localStorage.setItem('lists', JSON.stringify(lists));
}

// GitHub 설정
const GITHUB_TOKEN = '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';
const GITHUB_USERNAME = 'nomalria';
const GITHUB_REPO = 'listapps';
const DATA_FILE = 'lists.json';

// GitHub에 업로드
async function uploadToGithub() {
    try {
        const data = JSON.stringify(lists, null, 2);
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Update lists data',
                content: btoa(unescape(encodeURIComponent(data))),
                branch: 'main'
            })
        });

        if (response.ok) {
            alert('GitHub에 성공적으로 업로드되었습니다.');
        } else {
            throw new Error('업로드 실패');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('GitHub 업로드 중 오류가 발생했습니다.');
    }
}

// GitHub에서 불러오기
async function loadFromGithub() {
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const content = decodeURIComponent(escape(atob(data.content)));
            lists = JSON.parse(content);
            saveLists();
            renderLists();
            alert('GitHub에서 데이터를 성공적으로 불러왔습니다.');
        } else {
            throw new Error('데이터 불러오기 실패');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('GitHub에서 데이터를 불러오는 중 오류가 발생했습니다.');
    }
} 