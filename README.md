# JohorN (조호엔) & Teega Stay - GitHub Pages 배포 및 도메인 연동 가이드

본 웹사이트는 서버 백엔드 없이 작동하는 고품격 정적 웹 애플리케이션(SPA)입니다. GitHub Pages를 활용하여 무료로 호스팅할 수 있으며, 소유하고 계신 커스텀 도메인 `johorn.kr`을 즉시 연결하여 상용 웹사이트로 사용할 수 있도록 준비되어 있습니다.

---

## 1. 파일들을 GitHub 리포지토리에 올리기

1. **GitHub 계정 생성 및 로그인**: [GitHub 홈페이지](https://github.com)에서 계정을 만들고 로그인합니다.
2. **새로운 리포지토리(Repository) 생성**:
   - 우상단 `+` 버튼 클릭 -> `New repository` 선택.
   - **Repository name**에 원하는 프로젝트 명(예: `myjohorn` 또는 `johorn-stay`)을 입력합니다.
   - 공개 여부는 `Public`(공개)으로 설정합니다. (GitHub Free 계정에서 정적 호스팅을 사용하기 위함)
   - 아래 `Create repository` 버튼을 눌러 리포지토리를 생성합니다.

3. **로컬 파일 업로드 (Git 명령어 또는 웹 업로드)**:
   - **방법 A: Git CLI 사용 (권장)**
     프로젝트 폴더(`C:\Users\bkeng\.gemini\antigravity\scratch\consulting-stay-web`)에서 터미널을 열고 다음 명령어를 실행합니다.
     ```bash
     git init
     git add .
     git commit -m "Initial commit for JohorN Stay & Consulting site"
     git branch -M main
     git remote add origin https://github.com/[GitHub아이디]/[리포지토리명].git
     git push -u origin main
     ```
   - **방법 B: GitHub 웹페이지 드래그 앤 드롭 업로드**
     - 생성된 GitHub 리포지토리 페이지에서 "uploading an existing file" 링크를 클릭합니다.
     - `index.html`, `style.css`, `app.js`, `CNAME`, `README.md` 파일 및 `assets/` 폴더 전체를 브라우저로 드래그하여 업로드합니다.
     - 아래 `Commit changes`를 눌러 저장합니다.

---

## 2. GitHub Pages 활성화 및 도메인 설정

1. GitHub 리포지토리 화면 상단의 **Settings** (설정) 탭으로 이동합니다.
2. 좌측 사이드바에서 **Pages** 메뉴를 선택합니다.
3. **Build and deployment** 섹션의 Source가 `Deploy from a branch`로 설정되어 있는지 확인합니다.
4. **Branch** 설정에서 `None` 대신 `main` (또는 `master`) 브라우저를 선택하고, 폴더는 `/ (root)` 상태로 둔 뒤 **Save**를 클릭합니다.
5. 잠시 후 새로고침하면 `https://[GitHub아이디].github.io/[리포지토리명]/` 형식의 무료 배포 주소가 활성화됩니다.
6. **Custom domain** 입력 칸에 `johorn.kr`을 입력하고 **Save**를 누릅니다.
   - 프로젝트 루트에 이미 생성되어 있는 `CNAME` 파일 덕분에, 이 설정은 자동으로 매핑됩니다.
   - **Enforce HTTPS** 항목을 체크하여 보안 연결(HTTPS)을 필수로 설정합니다. (도메인 DNS 설정이 완료되면 활성화할 수 있습니다.)

---

## 3. johorn.kr 도메인 DNS 설정 (중요)

도메인을 구입하신 네임서버 관리 업체(예: 가비아, 후이즈, 고대디 등)의 DNS 관리 콘솔에 로그인하신 후, 아래 레코드들을 추가해 주셔야 합니다.

### A 레코드 추가 (GitHub Pages 서버 가리키기)
아래 4개의 IP 주소에 대해 `@` (호스트 이름)의 A 레코드를 각각 등록합니다.

| 타입 (Type) | 호스트 (Host) | 값 (Value / IP Address) |
| :--- | :--- | :--- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

### CNAME 레코드 추가 (`www` 서브도메인 리다이렉트 설정)
`www.johorn.kr`으로 접속해도 내 사이트로 연결되도록 CNAME 레코드를 설정합니다.

| 타입 (Type) | 호스트 (Host) | 값 (Value / Target) |
| :--- | :--- | :--- |
| CNAME | www | [GitHub아이디].github.io |

---

## 4. 로컬 테스트 및 관리자 접근

- 로컬에서 사이트의 정상 동작을 확인하려면 `index.html` 파일을 크롬 등 웹 브라우저에서 더블 클릭하여 실행하거나, VS Code 등의 `Live Server`를 실행하시면 됩니다.
- **관리자 로그인**:
  - 사이트 상단 메뉴의 **Admin** 탭을 클릭합니다.
  - 초기 설정된 관리자 비밀번호인 `1234`를 입력하여 대시보드에 접근할 수 있습니다.
  - 대시보드에서는 접수된 상담/예약 데이터를 한눈에 볼 수 있으며, 특정 예약 건의 상태를 "승인"으로 변경하면, 달력에서 해당 예약 기간이 실시간으로 예약 마킹 처리되어 다른 고객이 신청할 수 없게 됩니다.
  - 데이터는 웹 브라우저의 `LocalStorage`에 안전하게 저장됩니다. (서버 백엔드가 필요 없이 로컬 브라우저 세션에 저장되므로, 다른 브라우저나 컴퓨터에서는 데이터가 보이지 않으며 실제 상용화 시에는 백엔드 데이터베이스 구축을 검토할 수 있습니다.)
