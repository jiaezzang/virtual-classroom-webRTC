import { RefObject } from 'react';

/**
 * 비디오 객체를 캔버스에 그려준다.
 * @param param0.remoteVideo 비디오 Ref
 * @param param0.canvasRef 비디오를 다시 그려주는 전체 캔버스 Refs
 */
export const drawVideoToCanvas = ({ videoRef, canvasRef }: { videoRef: RefObject<HTMLVideoElement>; canvasRef: RefObject<HTMLCanvasElement> }) => {
    console.log(videoRef);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const drawVideo = () => {
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const scale = 0.5;
        const drawWidth = video.videoWidth * scale;
        const drawHeight = video.videoHeight * scale;
        // const dx = (canvas.width - drawWidth) / 2;
        const dy = (canvas.height - drawHeight) / 2;

        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        ctx?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, dy, drawWidth, drawHeight);
        requestAnimationFrame(drawVideo);
    };
    drawVideo();
};

/**
 * 미디어 스트림을 캔버스에 그려준다.
 * @param param0.stream MediaStream 형태의 Video
 * @param param0.canvasRef Video를 그릴 Cavnas Ref Object
 */
export const drawStreamToCanvas = ({ stream, canvasRef }: { stream: MediaStream; canvasRef: RefObject<HTMLCanvasElement> }) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // video 요소 생성 (DOM에 추가X)
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    // video 메타데이터 로드 후 canvas 크기 조정
    video.onloadedmetadata = function () {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawFrame();
    };

    function drawFrame() {
        if (video.paused || video.ended || !context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
    }
};
