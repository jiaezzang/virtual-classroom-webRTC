import { RefObject } from 'react';
import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation';

/**
 * Video에서 인물 외 요소를 제거하여 Canvas에 그려준다.
 */
export const useSelfieSegmentation = () => {
    const runSelfieSegmentation = ({
        video,
        canvasRef,
        selfieSegmentation
    }: {
        video: HTMLVideoElement;
        canvasRef: RefObject<HTMLCanvasElement>;
        selfieSegmentation: SelfieSegmentation;
    }) => {
        const render = async () => {
            if (!canvasRef.current || !selfieSegmentation) return;
            await selfieSegmentation.send({ image: video });
            selfieSegmentation.onResults((results: Results) => {
                const canvasCtx = canvasRef.current?.getContext('2d');
                if (!canvasCtx || !canvasRef.current) return;

                canvasRef.current.width = video.videoWidth;
                canvasRef.current.height = video.videoHeight;

                canvasCtx.save();
                canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);
                canvasCtx.globalCompositeOperation = 'source-in';
                canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
                canvasCtx.restore();
            });

            requestAnimationFrame(render);
        };

        render();
    };

    /** 초기화 */
    const startSelfieSegmentation = ({ video, canvasRef }: { video: HTMLVideoElement; canvasRef: RefObject<HTMLCanvasElement> }) => {
        const selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
            }
        });

        selfieSegmentation.setOptions({
            modelSelection: 1
        });
        if (!selfieSegmentation || !video || !canvasRef.current) return;
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;

        runSelfieSegmentation({ video, canvasRef, selfieSegmentation });
    };

    return { startSelfieSegmentation };
};
