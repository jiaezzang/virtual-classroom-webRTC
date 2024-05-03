# virtual-classroom-webRTC
- MediaPipe의 **Image Segmentation**를 이용하여 화상 비디오에 가상 배경을 적용
- Notion: **[Virtual ClassRoom Mediapipe&WebRTC (240327~240501)](https://jiaezzang.notion.site/Virtual-ClassRoom-Mediapipe-WebRTC-240327-240501-91301743bbd14b36b0044543793a916a?pvs=4)**

# 개발환경

![ye...png](https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdn%2FmTqc7%2FbtsFyyohIz3%2FNQySudSgBHLIkTgraMRBNk%2Fimg.png)

# 시작하기

## Clone Repository

```bash
$ git clone https://github.com/jiaezzang/virtual-classroom-webRTC.git
```

## **Installation**

- Server
    
    ```bash
    $ cd server
    
    $ npm ci
    
    $ npm start
    ```
    

- Client
    
    ```bash
    $ cd client
    
    $ npm ci
    
    $ npm run dev
    ```
    
## WebSocket

- `client/src/hooks/useSignaling.ts`
- useEffect 내부에서 WebSocket 주소 설정 (localhost ⇒ server를 연 PC의 IPv4 주소)
    
    ```tsx
    ws.current = new WebSocket('ws://localhost:3000');
    ```
    

# 프레임워크

## ***Google’s Open Source Framework <MediaPipe>***

[Image segmentation guide for web  |  MediaPipe  |  Google for Developers](https://developers.google.com/mediapipe/solutions/vision/image_segmenter/web_js)

# 구성

## Home

![home.png](https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdn%2F7VFG8%2FbtsG87jCJrQ%2FceMah8v07f6Uv2kc1NYFLk%2Fimg.png)

- `userType` 선택하여 입장
- teacher와 learner 각 한명 씩 입장 가능

## ClassRoom

![classRoom.png](https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdn%2FbuilSC%2FbtsHakP4JtQ%2F5cYGauNlugJjMaJI0haD4k%2Fimg.png)

- 두 userType을 나란히 놓고 가상 배경 설정 가능

