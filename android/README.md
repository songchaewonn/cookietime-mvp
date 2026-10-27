# CookieTime Android MVP

기존 모바일 화면을 WebView로 실행하고, Android 전용 기능은 JavaScript bridge와 네이티브 서비스로 연결한 MVP입니다. 웹 화면은 프로젝트 루트에서 빌드 시 `app/src/main/assets/www`로 자동 복사되므로 화면 수정 후 Android 프로젝트를 다시 빌드하면 반영됩니다.

## Android Studio에서 열기

1. Android Studio를 설치하고 이 `android` 폴더를 프로젝트로 엽니다.
2. Android SDK Platform 35와 JDK 17 이상을 설치합니다.
3. Gradle 동기화가 끝나면 USB 디버깅을 켠 Android 기기에서 `app` 구성을 실행합니다.
4. 설정 화면에서 앱 사용 기록, 다른 앱 위 표시, 알림 권한을 허용합니다. 정확한 알람은 Android 설정에서 허용할 수 있고, 거부되어도 시스템이 허용하는 부정확한 알림으로 동작합니다.

## 연결된 기능

- 설치된 런처 앱 목록을 선택 목록으로 표시하고, 선택값을 패키지 이름으로 Android에 저장합니다.
- 집중 시작 시 사용 기록 접근 권한과 오버레이 권한을 확인한 뒤 foreground service를 시작합니다.
- UsageStats 이벤트를 약 1.2초 간격으로 확인합니다. 선택된 앱이 화면에 올라오면 원본 쿠키 이미지를 포함한 플로팅 바를 띄우고, 복귀 시 닫습니다.
- 이탈이 5/10/20분을 넘으면 단계별 진동을 줍니다. 화면이 꺼지면 측정을 멈추고 해당 구간을 기록합니다.
- 과제 시작 10/5/3/1분 전과 정각에 AlarmManager 알림을 예약합니다. 정확한 알람 접근이 허용되지 않으면 시스템의 부정확한 idle 알람으로 대체합니다.
- 캐릭터 원본 이미지는 웹 프로토타입과 Android 오버레이가 같은 파일을 사용합니다.

## 현재 환경의 제한

이 작업 환경에는 Android SDK와 Android Studio가 없어 APK를 여기서 빌드하지 못했습니다. 프로젝트 소스는 Android Studio에서 열어 빌드할 수 있는 형태입니다. 실제 앱 감지와 오버레이는 Android 버전·제조사 권한 설정에 따라 기기 검증이 필요하며, Play Store 배포 전에는 특수 사용 foreground service와 사용 기록 권한 정책도 별도로 검토해야 합니다.
