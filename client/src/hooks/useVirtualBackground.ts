import { FilesetResolver, ImageSegmenter, ImageSegmenterResult } from '@mediapipe/tasks-vision';
import { RefObject, useCallback, useEffect, useRef } from 'react';
import summer from '../assets/images/bg/bg_summer.jpg';

let lastWebcamTime = -1;
export default function useVirtualBackground({
    canvasRef,
    localVideoRef,
    remoteVideoRef
}: {
    canvasRef: RefObject<HTMLCanvasElement>;
    localVideoRef: RefObject<HTMLVideoElement>;
    remoteVideoRef?: RefObject<HTMLVideoElement>;
}) {
    const imageSegmenterRef = useRef<ImageSegmenter | null>(null);
    const bgImageDataRef = useRef<ImageData | null>(null);
    const isBackdropImage = useRef(false);

    const predictWebcam = useCallback(() => {
        console.log(canvasRef.current, localVideoRef.current);
        if (!canvasRef.current || !localVideoRef.current) return;
        console.log('1');
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        console.log('2');
        if (localVideoRef.current.currentTime === lastWebcamTime) {
            window.requestAnimationFrame(predictWebcam);
            return;
        }
        lastWebcamTime = localVideoRef.current.currentTime;
        ctx.clearRect(0, 0, canvasRef.current.offsetWidth, canvasRef.current.offsetHeight);
        ctx.drawImage(
            localVideoRef.current,
            0,
            localVideoRef.current.videoHeight / 2,
            localVideoRef.current.videoWidth / 2,
            localVideoRef.current.videoHeight / 2
        );
        if (remoteVideoRef && remoteVideoRef.current) {
            ctx.drawImage(
                remoteVideoRef.current,
                localVideoRef.current.offsetWidth,
                canvasRef.current.offsetWidth - remoteVideoRef.current.offsetWidth,
                remoteVideoRef.current.videoWidth / 2,
                remoteVideoRef.current.videoHeight / 2
            );
        }

        if (!imageSegmenterRef.current) return;
        const startTimeMs = performance.now();
        imageSegmenterRef.current.segmentForVideo(canvasRef.current, startTimeMs, callbackForVideo);
    }, [canvasRef, localVideoRef.current]);

    const callbackForVideo = useCallback(
        (result: ImageSegmenterResult) => {
            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');

            if (!ctx) return;
            if (!localVideoRef.current || !localVideoRef.current.videoWidth || !localVideoRef.current.videoHeight) {
                window.requestAnimationFrame(predictWebcam);
                return;
            }

            const imageData = ctx.getImageData(0, 0, localVideoRef.current.videoWidth * 2, localVideoRef.current.videoHeight * 2);
            const mask = result.categoryMask?.getAsFloat32Array() ?? [];
            const maskLength = mask.length;
            // canvasRef.current.width = localVideoRef.current.videoWidth;
            // canvasRef.current.height = localVideoRef.current.videoHeight;

            // 배경이 존재할 경우에만, 배경 데이터(rgba)를 설정한다.
            if (isBackdropImage.current && bgImageDataRef.current) {
                let j = 0;
                for (let i = 0; i < maskLength; ++i) {
                    const color = Math.round(mask[i] * 255.0);

                    if (color === 255) {
                        imageData.data[j] = bgImageDataRef.current.data[j] ?? 0;
                        imageData.data[j + 1] = bgImageDataRef.current.data[j + 1] ?? 0;
                        imageData.data[j + 2] = bgImageDataRef.current.data[j + 2] ?? 0;
                        imageData.data[j + 3] = bgImageDataRef.current.data[j + 3] ?? 0;
                    }

                    j += 4;
                }
            }

            const uint8Array = new Uint8ClampedArray(imageData.data.buffer);
            const data = new ImageData(uint8Array, localVideoRef.current.videoWidth, localVideoRef.current.videoHeight);
            ctx.putImageData(data, 0, 0);
            window.requestAnimationFrame(predictWebcam);
        },
        [canvasRef, predictWebcam, localVideoRef]
    );

    const updateBackgroundImg = (src?: string) => {
        if (!src) src = summer;
        isBackdropImage.current = !!src;
        if (!isBackdropImage.current || !canvasRef.current) return;

        const backdropCanvas = document.createElement('canvas');
        const backdropCtx = backdropCanvas.getContext('2d');
        backdropCanvas.width = canvasRef.current.offsetWidth;
        backdropCanvas.height = canvasRef.current.offsetHeight;

        const backdropImage = new Image();
        backdropImage.src = src;

        backdropImage.onload = () => {
            if (!backdropCtx || !canvasRef.current) return;
            backdropCtx.drawImage(backdropImage, 0, 0, backdropCanvas.width, backdropCanvas.height);
            bgImageDataRef.current = backdropCtx.getImageData(0, 0, canvasRef.current.offsetWidth, canvasRef.current.offsetHeight);
            backdropCanvas.remove();
            backdropImage.remove();
        };
    };

    /** 초기 진입 설정 */
    useEffect(() => {
        /** 가상배경 설정을 초기화한다. */
        const initializeBackdropSettings = async () => {
            try {
                const data = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm');
                imageSegmenterRef.current = await ImageSegmenter.createFromOptions(data, {
                    baseOptions: { modelAssetPath: '/selfie_segmenter.tflite', delegate: 'GPU' },
                    runningMode: 'VIDEO',
                    outputCategoryMask: true,
                    outputConfidenceMasks: false
                });

                predictWebcam();
            } catch (error: unknown) {
                console.log(error);
            }
        };

        initializeBackdropSettings();

        // clean-up
        return () => {
            if (localVideoRef.current) {
                localVideoRef.current.pause();
                localVideoRef.current.srcObject = null;
            }
        };
    }, [canvasRef, predictWebcam, localVideoRef]);

    return { updateBackgroundImg };
}
