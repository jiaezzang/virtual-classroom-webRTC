import { FilesetResolver, ImageSegmenter, ImageSegmenterResult } from '@mediapipe/tasks-vision';
import { useCallback, useEffect, useRef } from 'react';
type TVirtualBackdrop = { video: HTMLVideoElement; canvasRef: React.RefObject<HTMLCanvasElement> };

/**
 * Video에서 인물 외 요소를 제거하여 Canvas에 그려준다.
 */
export const useSelfieSegmentation2 = ({ video, canvasRef }: TVirtualBackdrop) => {
    const imageSegmenterRef = useRef<ImageSegmenter | null>(null);
    const lastWebcamTimeRef = useRef(-1); // lastWebcamTime을 ref로 변경
    const predictWebcam = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');

        if (!ctx) return;
        if (video.currentTime === lastWebcamTimeRef.current) {
            window.requestAnimationFrame(() => predictWebcam());
            return;
        }
        lastWebcamTimeRef.current = video.currentTime;
        ctx?.clearRect(0, 0, video.videoWidth, video.videoHeight);
        ctx?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        if (!imageSegmenterRef.current) return;

        const startTimeMs = performance.now();
        imageSegmenterRef.current.segmentForVideo(video, startTimeMs, handleSegmentForVideo);
    }, [canvasRef, video]);

    const calculateEdgeSoftness = (maskValue: number) => {
        let alpha;
        if (maskValue > 0.5) {
            alpha = 0;
        } else {
            alpha = (1 - maskValue * 2) * 255;
        }
        return alpha;
    };

    /**
     * 비디오 프레임 내에 있는 이미지 객체를 분할한다.
     */
    const handleSegmentForVideo = useCallback(
        (result: ImageSegmenterResult) => {
            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');

            if (!ctx || !video || !video.videoWidth || !video.videoHeight) return;

            const imageData = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight);
            const mask = result.categoryMask?.getAsFloat32Array() ?? [];
            const pixels = imageData.data;

            for (let i = 0; i < mask.length; i++) {
                // 마스크 값이 0.5 이하면 인물, 이상이면 배경으로 처리
                const opacity = calculateEdgeSoftness(mask[i]);
                pixels[i * 4 + 3] = opacity; // Alpha 채널 조정
            }

            ctx.putImageData(imageData, 0, 0);
            window.requestAnimationFrame(predictWebcam);
        },
        [canvasRef, predictWebcam, video]
    );

    /** 초기 진입 설정 */
    useEffect(() => {
        /** 설정을 초기화한다. */
        const initializeSettings = async () => {
            if (!canvasRef.current) return;
            const canvas = canvasRef.current;
            try {
                const data = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm');
                imageSegmenterRef.current = await ImageSegmenter.createFromOptions(data, {
                    baseOptions: { modelAssetPath: '/selfie_segmenter.tflite', delegate: 'GPU' },
                    runningMode: 'VIDEO',
                    outputCategoryMask: true,
                    outputConfidenceMasks: false
                });

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                predictWebcam();
            } catch (error) {
                console.error('Error:', error);
            }
        };

        initializeSettings();

        // clean-up
        return () => {
            if (video) {
                video.pause();
                video.srcObject = null;
            }
        };
    }, [canvasRef, predictWebcam, video]);
};
