import { FilesetResolver, ImageSegmenter, ImageSegmenterResult } from '@mediapipe/tasks-vision';
import { RefObject, useCallback, useMemo, useRef } from 'react';

/**
 * MediaStream을 입력 받아, 배경을 크로마키 처리하여 캔버스에 그려주고 캔버스의 스트림을 반환한다.
 */
export const useSelfieSegmentation2 = ({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement> }) => {
    const bgImageDataRef = useRef<ImageData | null>(null);
    const isBackground = useRef(false);
    const localCanvas = useRef<HTMLCanvasElement>(document.createElement('canvas'));
    const localVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
    const remoteVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
    // const imageSegmenterRef = useRef<ImageSegmenter | null>(null);
    const lastWebcamTime = useRef(-1);
    const gap = useRef<number>(0);
    const vision = useMemo(async () => FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm'), []);
    const imageSegmenter = useMemo(
        async () =>
            await ImageSegmenter.createFromOptions(await vision, {
                baseOptions: { modelAssetPath: '/selfie_segmenter.tflite', delegate: 'GPU' },
                runningMode: 'VIDEO',
                outputCategoryMask: true,
                outputConfidenceMasks: false
            }),
        [vision]
    );

    const predictWebcam = useCallback(async () => {
        const localVideo = localVideoRef.current;
        const ctx = isBackground.current
            ? localCanvas.current?.getContext('2d', { willReadFrequently: true })
            : canvasRef.current?.getContext('2d', { willReadFrequently: true });
        const canvas = isBackground.current ? localCanvas.current : canvasRef.current;
        if (!ctx || !canvasRef.current || !canvas) return;

        // 마지막으로 캔버스에 그리기를 수행한 시간과 비디오 시간이 같으면 새로 그릴 필요 없음
        if (localVideo.currentTime === 0 || lastWebcamTime.current === localVideo.currentTime) {
            requestAnimationFrame(predictWebcam);
            return;
        }
        lastWebcamTime.current = localVideo.currentTime;
        const remoteVideo = remoteVideoRef.current;
        const width = localCanvas.current.width;
        const height = localCanvas.current.height;
        if (remoteVideo.autoplay) {
            //remote Stream 좌측에 그리기
            ctx?.drawImage(remoteVideo, (width / 4) * -1 + gap.current, 0, width / 2, height);
            //local Stream 우측에 그리기
            ctx?.drawImage(localVideo, width / 4 + gap.current, 0, width / 2, height);
            gap.current < width / 4 ? (gap.current += 15) : (gap.current = width / 4);
        } else {
            //localVideo 중앙에 그리기
            ctx?.drawImage(localVideo, width / 4 + gap.current, 0, width / 2, height);
            gap.current > 0 ? (gap.current -= 15) : (gap.current = 0);
        }
        if (!isBackground.current || !bgImageDataRef.current) {
            requestAnimationFrame(predictWebcam);
            return;
        }
        const startTimeMs = performance.now();
        (await imageSegmenter).segmentForVideo(canvas, startTimeMs, handleSegmentForVideo);
    }, [canvasRef, imageSegmenter]);

    /**
     * 비디오 프레임 내에 있는 이미지 객체를 분할한다.
     */
    const handleSegmentForVideo = useCallback(
        (result: ImageSegmenterResult) => {
            const mask = result.categoryMask?.getAsFloat32Array() ?? [];
            const maskLength = mask.length;
            if (!mask || !bgImageDataRef.current) {
                requestAnimationFrame(predictWebcam);
                return;
            }
            // console.log(maskLength);
            if (!canvasRef.current) return;
            const localCtx = localCanvas.current.getContext('2d');
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx || !localCtx) return;
            const imageData = localCtx.getImageData(0, 0, localCanvas.current.width, localCanvas.current.height);
            const pixels = imageData.data;
            if (isBackground.current && bgImageDataRef.current) {
                let j = 0;
                for (let i = 0; i < maskLength; ++i) {
                    // const color = Math.round(mask[i] * 255.0);

                    if (mask[i] === 1) {
                        pixels[j] = bgImageDataRef.current.data[j] ?? 0;
                        pixels[j + 1] = bgImageDataRef.current.data[j + 1] ?? 0;
                        pixels[j + 2] = bgImageDataRef.current.data[j + 2] ?? 0;
                        pixels[j + 3] = bgImageDataRef.current.data[j + 3] ?? 0;
                    }

                    j += 4;
                }
            }
            const uint8Array = new Uint8ClampedArray(pixels.buffer);
            const data = new ImageData(uint8Array, canvasRef.current.width, canvasRef.current.height);
            ctx.putImageData(data, 0, 0);
            window.requestAnimationFrame(predictWebcam);
        },
        [canvasRef, predictWebcam]
    );

    const updateVideo = ({ localVideo, remoteVideo, src }: { localVideo: HTMLVideoElement; remoteVideo?: HTMLVideoElement; src?: string | null }) => {
        localVideoRef.current = localVideo;
        if (remoteVideo) remoteVideoRef.current = remoteVideo;
        if (canvasRef.current) {
            // Canvas Size 설정
            canvasRef.current.width = canvasRef.current.offsetWidth;
            canvasRef.current.height = canvasRef.current.offsetHeight;
            localCanvas.current.width = canvasRef.current.offsetWidth;
            localCanvas.current.height = canvasRef.current.offsetHeight;
        }

        if (canvasRef.current && src && src.length > 0) {
            isBackground.current = src.length > 0;
            const bgCanvas = document.createElement('canvas');
            const bgCtx = bgCanvas.getContext('2d');
            bgCanvas.width = canvasRef.current.width;
            bgCanvas.height = canvasRef.current.height;

            const bgImage = new Image();
            bgImage.src = src;

            bgImage.onload = () => {
                if (!bgCtx) return;
                bgCtx.drawImage(bgImage, 0, 0, bgCanvas.width, bgCanvas.height);
                bgImageDataRef.current = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);
                bgCanvas.remove();
                bgImage.remove();
            };
        } else {
            isBackground.current = false;
        }
        predictWebcam();
    };

    return { updateVideo };
};
