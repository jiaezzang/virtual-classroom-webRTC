import { RefObject } from 'react';

/**
 * 비디오 객체를 캔버스에 그려준다.
 * @param param0.localVideo 로컬 비디오 Ref
 * @param param0.remoteVideo 리모트 비디오 Ref
 * @param param0.canvasRef 비디오를 다시 그려주는 전체 캔버스 Ref
 */
export const drawVideoToCanvas = ({
    localVideo,
    remoteVideo,
    canvasRef
}: {
    localVideo: HTMLVideoElement;
    remoteVideo?: HTMLVideoElement;
    canvasRef: RefObject<HTMLCanvasElement>;
}) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const drawVideo = () => {
        if (!canvas || !localVideo) return;

        const ctx = canvas.getContext('2d');
        canvas.width = localVideo.videoWidth;
        canvas.height = localVideo.videoHeight;
        const scale = 0.5;
        const drawWidth = localVideo.videoWidth * scale;
        const drawHeight = localVideo.videoHeight * scale;
        const dx = (canvas.width - drawWidth) / 2;
        const dy = (canvas.height - drawHeight) / 2;

        ctx?.clearRect(remoteVideo?.autoplay ? 0 : dx, dy, drawWidth, drawHeight);
        ctx?.drawImage(localVideo, 0, 0, localVideo.videoWidth, localVideo.videoHeight, remoteVideo?.autoplay ? 0 : dx, dy, drawWidth, drawHeight);
        if (remoteVideo?.autoplay) {
            ctx?.clearRect(drawWidth, dy, drawWidth, drawHeight);
            ctx?.drawImage(remoteVideo, 0, 0, remoteVideo.videoWidth, remoteVideo.videoHeight, drawWidth, dy, drawWidth, drawHeight);
        }
        requestAnimationFrame(drawVideo);
    };
    drawVideo();
};
