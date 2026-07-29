# 오재호 | Backend Developer

> 신입 백엔드 개발자 오재호입니다.

[GitHub](https://github.com/Jhoae) · [Email](mailto:ohjaehokor@gmail.com)

## Project 01 — AIRS - [AIRS Backend](https://github.com/Jhoae/airs-backend)

<p>
  <img alt="Java 21" src="https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white"/>&nbsp;
  <img alt="Spring Boot 3.5.13" src="https://img.shields.io/badge/Spring_Boot-3.5.13-6DB33F?logo=springboot&logoColor=white"/>&nbsp;
  <img alt="Spring Security" src="https://img.shields.io/badge/Spring_Security-6DB33F?logo=springsecurity&logoColor=white"/>&nbsp;
  <img alt="Spring Data JPA" src="https://img.shields.io/badge/Spring_Data_JPA-59666C"/>&nbsp;
  <img alt="JWT" src="https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white"/>&nbsp;
  <img alt="MySQL" src="https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white"/>&nbsp;
  <img alt="InfluxDB" src="https://img.shields.io/badge/InfluxDB-22ADF6?logo=influxdb&logoColor=white"/>&nbsp;
  <img alt="Redis" src="https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white"/>&nbsp;
  <img alt="MQTT" src="https://img.shields.io/badge/MQTT-660066?logo=mqtt&logoColor=white"/>&nbsp;
  <img alt="Flyway" src="https://img.shields.io/badge/Flyway-CC0200?logo=flyway&logoColor=white"/>&nbsp;
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white"/>&nbsp;
  <img alt="Testcontainers" src="https://img.shields.io/badge/Testcontainers-3E86A0"/>&nbsp;
</p>

AIRS는 실내 환경 센서가 보내는 온도·습도·CO2·재실 정보를 수집하고, 공간의 최신 상태와 기간별 시계열을 제공하는 프로젝트입니다. 저는 반복해서 들어오는 telemetry를 어떤 경로로 처리하고 어디에 저장할지, 관리자에게 필요한 데이터를 어떤 비용으로 조회할지를 백엔드의 핵심 문제로 다뤘습니다.

<table>
  <tbody>
    <tr>
      <td><strong>기간</strong></td>
      <td>2026.04–2026.07</td>
    </tr>
    <tr>
      <td><strong>팀 구성</strong></td>
      <td>5명 — PM, Hardware, Mobile, Backend, Frontend</td>
    </tr>
    <tr>
      <td><strong>역할</strong></td>
      <td>백엔드 개발 담당</td>
    </tr>
    <tr>
      <td><strong>담당 범위</strong></td>
      <td>전체 백엔드 API와 데이터베이스 설계</td>
    </tr>
    <tr>
      <td><strong>주요 기여</strong></td>
      <td>MQTT, 시계열·Redis 캐시 설계, 인증 · Flyway · CI/CD</td>
    </tr>
  </tbody>
</table>

### 아키텍처와 데이터 흐름

![AIRS Backend System Architecture](https://raw.githubusercontent.com/Jhoae/airs-backend/main/docs/architecture/system-architecture.png)

센서 telemetry는 Mosquitto를 거쳐 Spring MQTT callback에 도착합니다. callback은 payload를 검증해 nodeId별 worker로 전달하고, 순번 검사와 재실 판정을 통과한 데이터는 MySQL의 최신 snapshot과 InfluxDB의 시계열 이력으로 나뉘어 저장됩니다.

관리자 조회에서는 JWT로 식별한 사용자의 역할·승인 상태·캠퍼스 접근 범위를 DB에서 확인한 뒤, 같은 시계열 요청의 Redis 응답을 먼저 확인합니다. 캐시 미스에서는 조회 기간에 따라 InfluxDB raw·hourly rollup·daily rollup 중 하나를 선택합니다.

## Problem Solving

### 1. MQTT callback에 묶인 동기 I/O를 분리해 24,000건 수집 경로 검증

개발 Mac의 격리된 Docker staging에서 200개 가상 노드가 QoS 1 메시지를 1초마다 120초 동안 발행하도록 구성했습니다. 논리적으로 24,000건을 발행했지만 InfluxDB의 `co2_ppm` 적재는 10,141건이었고, Mosquitto 로그에는 subscriber outgoing message drop이 남았습니다.

처음에는 InfluxDB 쓰기 속도를 의심했지만 callback부터 저장까지의 호출을 따라가며 범위를 넓혔습니다. 당시 callback은 Redis 순번 검사, 재실 판정, MySQL snapshot 갱신, InfluxDB 적재와 후속 평가를 한 흐름에서 호출했습니다. InfluxDB를 비동기 batch write로 바꾸는 것만으로는 callback이 여러 I/O를 기다리는 구조가 남았습니다.

팀과 함께 callback이 payload 검증과 enqueue까지만 담당하도록 수집 경계를 변경했습니다. nodeId 해시로 8개의 단일 worker 중 하나를 선택해 같은 노드의 순서를 유지하고, 다른 노드는 서로 다른 worker에서 처리했습니다. 각 worker에는 2,000개 크기의 bounded queue를 두었으며, queue가 가득 차면 새 메시지를 버리거나 메모리를 계속 늘리지 않고 callback이 빈 공간을 기다려 broker 방향으로 backpressure를 전달하도록 선택했습니다.

변경 후에는 1,000개 가상 node identity, MQTT 연결 50개, 노드별 5초 주기, 120초, QoS 1 조건으로 별도 검증했습니다. 발행한 24,000건과 InfluxDB에 적재된 `co2_ppm` 24,000건이 일치했고, 모든 노드가 각각 24건을 저장했습니다. MySQL의 node·space snapshot은 각각 1,000행이었으며 Mosquitto drop/error 로그는 없었습니다. 초기 실험과 변경 후 실험의 부하 조건이 다르므로 두 결과로 단순 개선율은 계산하지 않았습니다.

### 2. downsampling 후에도 남은 raw scan을 기간별 rollup으로 분리

5초 단위 raw 데이터를 5일에는 1시간, 1개월에는 6시간 point로 downsampling했지만, 반환 데이터 수만 줄어들 뿐 InfluxDB는 기간에 포함된 raw를 계속 읽었습니다. 노드 하나가 5초마다 CO2를 보낸다면 5일 조회는 약 86,400개, 1개월 조회는 약 518,400개의 raw point를 읽고도 약 120개 point만 반환할 수 있는 구조였습니다.

캐시는 반복 요청을 줄이지만 첫 요청의 집계 비용은 없애지 못하고, raw retention을 짧게 잡으면 오류 재현과 집계 정책 변경 시 원본을 잃습니다. 이에 raw는 재분석과 rollup 재생성의 기준 데이터로 보존하고, InfluxDB Task가 만드는 rollup을 조회용 파생 데이터로 구분했습니다.

최근 1일은 최신성을 위해 raw를 사용하고, 5일은 hourly rollup, 1개월은 hourly rollup을 6시간 단위로 다시 묶도록 설계했습니다. 시간별 수집 건수가 다를 때 평균들의 단순 평균이 왜곡되지 않도록 `mean × count` 합계를 전체 count로 나눴습니다. 6개월과 1년은 daily rollup을 우선 사용하고, 아직 집계가 끝나지 않은 최신 경계는 raw로 보완했습니다. 필요한 rollup이 빠졌거나 조회에 실패하면 부분 결과를 섞지 않고 전체 raw 경로로 돌아가도록 했습니다.

daily rollup 검증에서는 raw `co2_ppm` 17,279건의 mean·min·max·count와 생성된 네 rollup field가 일치했습니다. 같은 CO2 분석 API의 단일 cold 요청을 Raspberry Pi host 내부에서 측정했을 때, raw 집계 경로의 7.385초와 rollup 적용 후 0.224초를 기록했습니다. 이는 해당 요청 한 건의 Spring API 전체 시간이며 모든 기간과 동시 요청의 성능을 일반화한 수치는 아닙니다.

### 3. 동일 cache miss 20건을 한 번의 InfluxDB 조회로 수렴

같은 노드·지표·기간의 캐시가 만료되는 순간 요청이 몰리면, 모든 요청이 동일한 raw 또는 rollup을 다시 읽을 수 있었습니다. 평소의 cache hit만 확인해서는 만료 시점에 생기는 중복 조회를 발견하기 어려웠고, JVM 내부 lock은 여러 Spring 인스턴스가 같은 Redis를 사용할 때 요청을 조정할 수 없었습니다.

응답 key와 별도로 Redis load-lock key를 두고, `SET NX EX`로 잠금을 얻은 요청만 InfluxDB를 조회하도록 설계했습니다. leader의 조회가 길어질 때 잠금이 먼저 풀리지 않도록 고유 token을 확인하는 Lua script로 TTL을 연장하고, 해제할 때도 같은 token의 잠금만 삭제했습니다. cold miss의 follower는 최대 1초 동안 25ms 간격으로 결과를 확인한 뒤 저장된 JSON을 재사용합니다.

센서 그래프는 수 초의 절대 최신성보다 조회 경로를 끊지 않는 편이 적합하다고 판단했습니다. 정상 TTL 30초가 지난 응답도 60초 동안 stale 값으로 남겨, leader가 갱신하는 동안 follower가 이전 성공 응답을 즉시 사용할 수 있게 했습니다. Redis 자체가 실패하거나 제한 시간 안에 결과가 만들어지지 않으면 API를 실패시키지 않고 InfluxDB 직접 조회로 우회했습니다.

응답 key 하나만 삭제하고 20개 VU가 같은 API를 동시에 호출한 결과, 실패 없이 `miss 1건`, `InfluxDB hourly rollup load 1건`, `hit_after_wait 6건`, `hit 13건`으로 기록됐습니다. 20개 요청이 InfluxDB에 각각 전달되지 않고 한 요청의 결과를 공유한 것을 Spring metric으로 확인했습니다. 당시 단일 Raspberry Pi·한 개 운영 노드에서 인증된 read-only API를 20 RPS로 10분 호출한 별도 실험은 로그인 1건을 포함한 HTTP 12,002건에서 실패 0건, 외부 HTTPS P95 330.34ms를 기록했습니다.

### 4. QoS 1 중복·순서 역전이 최신 상태를 되돌리지 않도록 차단

MQTT QoS 1은 전달을 보강하지만 같은 메시지가 다시 도착할 수 있습니다. 재전송된 telemetry나 늦게 도착한 과거 메시지를 그대로 처리하면 InfluxDB 이력이 중복되고, MySQL 최신 snapshot과 재실 상태가 과거 값으로 돌아갈 수 있습니다.

`sequence_no`만 비교하면 장치가 재부팅돼 순번이 다시 시작될 때 정상 메시지를 과거 데이터로 오인합니다. 애플리케이션에서 Redis 값을 읽은 뒤 비교하고 다시 쓰는 방식도 동시 요청 사이의 원자성을 보장하지 못합니다. 그래서 노드와 부팅 세션을 함께 식별하는 `boot_id + sequence_no`를 계약으로 정하고, Redis Lua script 한 번으로 현재 최대 순번의 비교와 갱신을 수행했습니다.

처음 보거나 더 큰 순번만 통과시키고, 같은 순번은 duplicate, 작은 순번은 out-of-order로 분류해 재실 계산과 MySQL·InfluxDB 저장 전에 중단합니다. 구형 payload에는 기존 경로를 유지하고, Redis 장애 시에는 센서 수집 전체를 멈추지 않도록 기존 저장 흐름으로 우회했습니다. 이 선택은 수집 지속성을 우선하는 대신 Redis 장애 동안 중복 방어가 약해지는 비용을 가집니다.

단위 테스트에서 최초·증가 순번의 통과, 같은 순번과 작은 순번의 차단, 순번 필드가 없는 payload의 호환 경로, Redis 연결 실패 시 우회를 각각 확인했습니다. ingestion 서비스 테스트에서는 duplicate 판정 뒤 snapshot과 raw writer가 호출되지 않는 경계까지 검증했습니다.

## Backend Engineering

### 데이터의 성격에 따른 저장소 분리

사용자·캠퍼스·공간·노드 설치 정보와 현재 상태처럼 관계와 제약이 필요한 데이터는 MySQL에 저장했습니다. 반복해서 쌓이는 센서 이력은 InfluxDB raw measurement에 기록하고, 조회 비용을 줄이기 위한 rollup은 언제든 raw에서 다시 만들 수 있는 파생 데이터로 취급했습니다. Redis에는 재생성 가능한 API 응답과 telemetry 최대 순번처럼 짧은 수명과 원자 연산이 필요한 상태만 두었습니다.

### 인증과 인가

JWT에는 사용자 식별자를 담고, 실제 접근 권한은 요청 시 DB의 `ROOT_ADMIN·ADMIN·USER` 역할, 관리자 신청 상태, 소속 캠퍼스와 노드 설치 관계를 확인해 판단했습니다. 토큰에 들어 있던 과거 권한만 믿지 않고 승인·거절과 소속 변경이 다음 요청에 반영되도록 인증과 인가의 책임을 분리했습니다.

### 스키마 변경과 배포 검증

DB 변경은 Flyway migration으로 순서를 고정하고, 빈 MySQL에서의 최초 생성과 기존 스키마의 변경을 MySQL Testcontainers로 검증했습니다. 프로젝트 진행 당시 GitHub Actions는 Gradle 테스트를 통과한 revision만 Raspberry Pi에 배포하고, Docker Compose 기동 뒤 Spring health endpoint를 확인하도록 구성했습니다. 외부 요청은 Caddy가 TLS를 종료해 Spring으로 전달했습니다.
