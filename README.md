# 모아 · 우리 가족 학원 시간표

GitHub에 올려 직접 운영할 수 있는 독립 웹앱입니다. ChatGPT Sites나 ChatGPT 로그인이 필요하지 않습니다. 아이폰·갤럭시에서 같은 주소와 가족 비밀번호를 사용합니다.

## 포함된 기능

- 월요일부터 일요일까지 주간 시간표, 이전/다음 주, 오늘로 이동
- 수업 추가·수정·삭제, 매주 반복과 종료일
- 수업 위 손잡이를 드래그해 요일·시간 이동, 아래 손잡이를 드래그해 15분 단위 길이 조절
- 터치 드래그 및 키보드 방향키 지원, 겹치는 수업 나란히 표시
- 반복 수업 변경 시 연결된 숙제·준비물 날짜도 이동
- 수업 10분 전 Web Push, 미완료 준비물·숙제는 전날 20:00 Web Push (한국 시간)
- 두 기기 각각 알림 구독·해제·테스트, 서버에서 15초마다 전송 대상 확인
- JPG/PNG/WebP 사진·캡처 업로드, AI가 숙제·준비물과 관련 수업/날짜 추출
- 확신도가 높고 실제 일정에 존재하는 날짜이면 자동 저장, 애매하면 검토 후 저장
- 원본 사진 보기, 항목 완료·삭제, SQLite 영구 저장, 15초 간격 화면 동기화
- 가족 비밀번호 로그인, HttpOnly 세션, 요청 출처 검사, API 키는 서버에만 저장

## 꼭 알아둘 점

**GitHub는 소스 보관 장소입니다. GitHub Pages만으로는 푸시 알림·공유 저장·사진 분석이 작동하지 않습니다.** Node.js 서버를 항상 실행하는 HTTPS 호스팅이 필요합니다. 이 파일은 배포하거나 실제 키를 설정한 상태가 아닙니다.

앱은 한 가족용입니다. 서버 인스턴스는 **1개**만 실행하세요. SQLite 데이터 폴더를 영구 볼륨에 연결해야 재배포 후에도 데이터가 남습니다. 무료 절전형 호스팅처럼 서버가 멈추는 환경에서는 정시 알림을 보장할 수 없습니다.

## 내 컴퓨터에서 실행

1. Node.js **24 이상**을 설치합니다.
2. 이 폴더를 열고 터미널에서 실행합니다.

```sh
npm ci
```

3. `.env.example`을 `.env`로 복사합니다. Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```sh
cp .env.example .env
```

4. `.env`의 `FAMILY_PASSWORD`를 12자 이상의 나만의 비밀번호로 바꿉니다. 예시 비밀번호 그대로면 서버가 실행되지 않습니다.
5. 실행합니다.

```sh
npm start
```

6. 브라우저에서 `http://localhost:3000`을 엽니다. 시간표·메모는 API 키 없이도 쓸 수 있습니다. 사진 분석은 키 설정 전에는 수동 입력으로 안내합니다.

## 푸시 알림 설정

```sh
npm run vapid
```

출력된 공개키·비밀키를 `.env`의 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`에 입력합니다. `VAPID_SUBJECT`는 운영자의 실제 이메일로 바꿉니다. **한 번 만든 키를 유지**하세요. 키를 변경하면 각 기기의 알림 구독을 다시 설정해야 합니다.

실제 호스팅에서는 `APP_ORIGIN=https://실제-앱-주소`로 설정하고 HTTPS를 연결하세요. 끝에 `/`를 붙이지 마세요. 이 값이 브라우저의 주소와 다르면 저장 요청이 거절됩니다. `http://localhost:3000`은 개발용입니다. 휴대폰에서 PC의 사설 IP로 HTTP 접속하는 방식은 푸시 테스트에 적합하지 않습니다.

### 아이폰

1. iOS 16.4 이상에서 Safari로 앱 주소를 엽니다.
2. 공유 → **홈 화면에 추가**를 누릅니다. ‘웹 앱으로 열기’ 옵션이 보이면 켭니다.
3. 홈 화면의 모아 아이콘으로 실행하고 로그인합니다.
4. **알림 설정 → 이 기기 알림 켜기 → 허용**을 누릅니다.
5. **테스트 알림**을 누르고 도착을 확인합니다.

### 갤럭시

1. Chrome으로 같은 HTTPS 주소를 열고 로그인합니다.
2. **알림 설정 → 이 기기 알림 켜기 → 허용**을 누릅니다.
3. 테스트 알림으로 확인합니다. 원하면 Chrome 메뉴에서 홈 화면에 추가합니다.

각자 설정해야 두 휴대폰 모두 알림을 받습니다. 로그아웃해도 기존 기기의 푸시 구독은 유지됩니다. 알림을 멈추려면 해당 기기에서 **알림 끄기**를 누르세요. 잠금 화면에 숙제 내용이 표시될 수 있으므로 휴대폰의 알림 미리보기 설정도 선택할 수 있습니다.

알림은 서버에서 전송하지만 휴대폰의 집중 모드·절전·네트워크·OS 정책에 따라 지연될 수 있습니다. 서버 재시작 시 5분 이내 누락 알림만 재시도하고, 오래된 알림은 보내지 않습니다. 발송 성공 기록은 중복을 줄이지만 발송 직후 서버 장애가 나면 재전송될 수 있습니다.

## 사진 자동 입력 설정

`.env`에 `OPENAI_API_KEY`를 넣고 서버를 재시작합니다. `OPENAI_MODEL` 기본값은 `gpt-4.1-mini`이며 이미지 입력과 Structured Outputs를 지원하는 계정 내 사용 가능 모델로 바꿀 수 있습니다. API 사용 비용은 별도입니다.

앱에서 사진을 올리면 이미지와 등록된 수업 정보가 OpenAI Responses API로 전송됩니다. `store:false`로 요청합니다. 관련 수업 ID, 수업 날짜, 내용이 모두 유효하고 확신도 0.9 이상인 결과만 자동 저장합니다. 애매하거나 사진 분석에 실패하면 원본 사진을 유지하고 수동 입력을 제공합니다. **AI의 해석은 틀릴 수 있으니 저장된 내용을 확인하세요.** 여러 수업이 한 사진에 섞이면 한 번에 자동 저장하지 않으며 수업별로 나누어 입력하세요.

사진은 서버의 `data/photos/`에 보관됩니다. 항목을 지워도 원본 파일은 자동 삭제되지 않습니다. 운영자가 백업·보관 정책에 따라 정리해야 합니다. 가족 비밀번호를 아는 사람은 가족의 모든 일정과 사진에 접근할 수 있습니다.

## GitHub에 올리는 방법

GitHub에 새 저장소를 만든 후 **이 폴더의 내용**을 올립니다. 비공개 저장소를 권장합니다. `node_modules`, 실제 `.env`, `data` 폴더는 올리지 마세요. `.gitignore`가 포함되어 있습니다.

```sh
git init
git add .
git commit -m "Create Moa family schedule app"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

GitHub 웹에서 업로드해도 됩니다. 압축파일 자체가 아니라 압축을 푼 파일들을 올리세요. `.env.example`, `.gitignore`, `.dockerignore`도 포함해야 합니다. 실제 GitHub 저장소 생성·업로드는 이 작업에서 수행하지 않았습니다.

## 서버 배포

Node.js 24와 영구 디스크를 지원하는 항상 켜진 서버를 준비합니다.

- 설치: `npm ci --omit=dev`
- 시작: `npm start`
- 환경변수: `.env.example`의 값들을 호스팅 서비스의 비밀 환경변수 설정에 입력
- 영구 디스크: `DATA_DIR`에 연결
- 상태 확인: `/health`
- HTTPS: 호스팅 제공 인증서 또는 리버스 프록시를 사용
- 복제 수: 1

Docker를 사용하는 경우:

```sh
docker compose up -d --build
```

`compose.yaml`은 데이터를 `moa-data` 볼륨에 저장하고 3000번 포트를 엽니다. **HTTPS 인증서와 도메인은 따로 연결**해야 합니다. 자동으로 도메인을 발급하지 않습니다. 기존 포트와 충돌하면 외부 포트를 조정하세요.

### 백업과 비밀번호 변경

서버를 중지한 상태에서 데이터 디렉터리 전체(SQLite 및 사진)를 백업하고 다시 시작하세요. 데이터와 업로드 사진은 GitHub로 백업하지 마세요. 가족 비밀번호 변경 후 기존 세션까지 해제하려면 서버를 중지하고 SQLite `sessions` 테이블의 행을 삭제한 뒤 재시작합니다. 푸시 구독 해제는 별도이며, 필요하면 `subscriptions` 테이블을 비웁니다.

## 테스트와 검증 범위

```sh
npm test
```

시간대·반복·10분 전·전날 알림·잘못된 날짜 테스트와 로그인·저장·충돌·재시작 영속성 API 테스트가 포함되어 있습니다. 실제 OpenAI API 호출과 iOS/Android 원격 푸시 수신은 API 키·HTTPS 서버·실제 기기에서 별도 검증해야 합니다. 테스트는 유료 API를 호출하지 않습니다.

## 구조

```text
server.mjs              HTTP API, SQLite, 사진 분석, 푸시 발송
schedule.mjs            한국 시간 기준 반복·알림 계산
public/                 주간 시간표 UI 및 PWA
scripts/vapid.mjs       알림 키 생성
test/                   일정 계산 및 API 테스트
.env.example            설정 예시 (비밀키 없음)
Dockerfile / compose.yaml
```

## 참고 문서

- [Apple Web Push 안내](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Web Push Node 라이브러리](https://github.com/web-push-libs/web-push)
- [Node.js SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
- [OpenAI 이미지 입력](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI 구조화 출력](https://developers.openai.com/api/docs/guides/structured-outputs)
