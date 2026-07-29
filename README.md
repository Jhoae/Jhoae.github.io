# Oh Jaeho — Backend Portfolio

오재호의 신입 백엔드 개발자 취업용 포트폴리오 저장소입니다.

현재는 공개 사이트를 바로 채우기 전에 다음 작업을 진행하고 있습니다.

1. AIRS의 코드·테스트·실험 결과에서 검증 가능한 사실을 추출합니다.
2. 오재호의 문제 해결 방식과 백엔드 역량을 먼저 정의합니다.
3. AIRS를 첫 번째 프로젝트 사례로 정리합니다.
4. 모든 핵심 주장에 코드·테스트·로그·문서 근거를 연결합니다.
5. 과장 표현과 미검증 수치를 제거한 뒤 GitHub Pages로 공개합니다.

상세한 작성 순서는 [PORTFOLIO_BUILD_STEPS.md](docs/PORTFOLIO_BUILD_STEPS.md)에 기록합니다.
AIRS 코드 기준 시점은 [AIRS_BASELINE.md](docs/AIRS_BASELINE.md)에 고정합니다.

## 공개 사이트의 기본 구조

사이트는 프론트엔드 기능을 과시하기 위한 결과물이 아니라, 백엔드 문제 해결 경험을 빠르게 읽을 수 있는 단일 페이지로 구성합니다.

```text
Home
├─ About
├─ Backend Competencies
├─ Project — AIRS
│  ├─ Overview
│  ├─ Architecture
│  └─ Problem Solving
└─ Contact
```

- Troubleshooting은 별도 최상위 메뉴로 분리하지 않고 AIRS 안의 Problem Solving에 포함합니다.
- Engineering Principles는 별도 긴 선언문으로 만들지 않고 About과 Backend Competencies의 근거 문장에 반영합니다.
- 기술 로고, 숙련도 막대, 과도한 애니메이션은 사용하지 않습니다.
- 아직 검증하지 않은 기술과 성과는 공개하지 않습니다.
