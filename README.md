# 방덱 목록 관리 도구

## 소개

이 웹 애플리케이션은 게임 등에서 사용될 수 있는 '방덱' 목록과 관련 메모를 효율적으로 관리하기 위한 도구입니다. 사용자는 방덱 목록을 생성, 편집, 삭제하고 각 목록에 상세 메모를 추가하여 관리할 수 있습니다. 모든 데이터는 브라우저의 로컬 스토리지에 저장되며, GitHub 계정을 연동하여 데이터를 백업하고 불러올 수 있습니다.

## 주요 기능

*   **방덱 목록 관리:**
    *   **생성:** 새로운 방덱 목록을 추가합니다. (입력 단어 수에 따라 지능적인 추가/이동 기능)
    *   **조회 (페이지네이션):** 기존 목록을 페이지 단위(페이지당 20개)로 나누어 조회합니다. (`<<`, `<`, 페이지 번호, `>`, `>>` 및 이전/다음 페이지 버튼 제공)
    *   **편집:** 방덱 목록의 제목을 수정합니다.
    *   **삭제:** 방덱 목록을 삭제합니다.
    *   **필터링:** '4방덱', '5방덱', '기타', '전체 보기' 기준으로 기존 목록을 필터링합니다.
*   **메모 관리:**
    *   **추가:** 각 방덱 목록 아래에 상세 메모를 추가합니다. (최대 50개)
    *   **자동 상태 설정:** 메모 내용 끝에 특정 키워드('공성', '공격성공', '공실', '공격실패') 입력 시 자동으로 성공/실패 상태가 설정되고 키워드는 제거됩니다.
    *   **상태 변경:** 각 메모의 성공/실패 상태를 버튼 클릭으로 쉽게 변경(토글)할 수 있습니다.
    *   **편집:** 메모 내용을 수정합니다.
    *   **삭제:** 메모를 삭제합니다.
    *   **메모 영역 토글:** 목록 제목 클릭 시 메모 영역을 펼치거나 접을 수 있습니다.
*   **임시 목록:**
    *   새로 추가되거나 검색/필터링된 목록이 임시로 보관됩니다.
    *   임시 목록의 항목을 "기존목록 추가" 버튼으로 기존 목록 영역으로 한 번에 옮길 수 있습니다.
*   **검색 및 추천:**
    *   검색창에 단어를 입력하면 기존 목록의 방덱 이름 중 일치하는 단어를 실시간으로 추천합니다.
    *   방향키, 탭, 스페이스바로 추천 단어를 선택하여 입력을 보조합니다.
*   **정렬:**
    *   "목록 및 메모 정렬" 버튼으로 기존 목록과 임시 목록 모두 정렬합니다.
    *   목록 정렬 기준: 1순위 (타입: 4방덱 > 5방덱 > 기타), 2순위 (이름 가나다순)
    *   메모 정렬 기준: 각 메모 텍스트의 **첫 단어**를 기준으로 **가나다순**(한국어 기준)으로 정렬합니다. (상태나 전체 길이는 정렬에 영향을 주지 않습니다.)
*   **GitHub 연동:**
    *   GitHub OAuth를 통한 로그인/로그아웃 기능을 제공합니다.
    *   로컬 데이터를 GitHub 리포지토리에 업로드할 수 있습니다. (임시 목록 유무에 따라 변경사항 또는 전체 업로드)
    *   GitHub 리포지토리에 저장된 데이터를 불러올 수 있습니다. (변경사항 또는 전체 불러오기)
    *   **참고:** GitHub 연동 기능은 별도의 서버 측 구현(인증 처리, 파일 저장/로드 API)이 필요합니다. (`/api/auth`, `/api/upload_changes`, `/api/upload_main`, `/api/download_changes`, `/api/download_all` 등)
*   **기타 편의 기능:**
    *   목록/메모 추가, 정렬 등 작업 후 상태 메시지를 버튼 아래에 표시합니다.
    *   `백틱(\`)` 키로 열려있는 메모 영역을 닫을 수 있습니다.
    *   데이터는 브라우저 로컬 스토리지에 자동 저장됩니다.

## 기술 스택

*   HTML
*   CSS
*   JavaScript (Vanilla JS)

## 실행 방법

별도의 설치 과정 없이 웹 브라우저에서 `index.html` 파일을 열어 바로 사용할 수 있습니다. 