import { useRef, useCallback, RefObject, useMemo } from 'react';
import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation';

/**
 * Video에서 인물 외 요소를 제거하여 Canvas에 그려준다.
 */
export const useSelfieSegmentation = () => {
    const selfieSegmentationRef = useRef<SelfieSegmentation | null>(null);
    const selfieSegmentation = useMemo(() => {
        const selfieSegmentationInstance = new SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });

        selfieSegmentationInstance.setOptions({
            modelSelection: 1,
            selfieMode: true
        });

        return selfieSegmentationInstance;
    }, []);

    const startSelfieSegmentation = useCallback(({ video, canvasRef }: { video: HTMLVideoElement; canvasRef: RefObject<HTMLCanvasElement> }) => {
        if (!canvasRef.current || !video) return;

        selfieSegmentation.onResults((results: Results) => {
            const canvasCtx = canvasRef.current?.getContext('2d');
            if (!canvasCtx || !canvasRef.current) return;

            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);
            canvasCtx.globalCompositeOperation = 'source-in';
            canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
            canvasCtx.restore();
        });

        selfieSegmentationRef.current = selfieSegmentation;

        const render = () => {
            if (selfieSegmentationRef.current) {
                selfieSegmentation.send({ image: video });
            }
            requestAnimationFrame(render);
        };

        render();
    }, []);

    return { startSelfieSegmentation };
};
