import { FilesetResolver, ImageSegmenter, ImageSegmenterResult } from '@mediapipe/tasks-vision';
import { RefObject, useCallback, useMemo, useRef } from 'react';

/**
 * MediaStream을 입력 받아, 배경을 크로마키 처리하여 캔버스에 그려주고 캔버스의 스트림을 반환한다.
 */
export const useSelfieSegmentation = ({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement> }) => {
    const bgImageDataRef = useRef<ImageData | null>(null);
    const isBackground = useRef(false);
    const localCanvas = useRef<HTMLCanvasElement>(document.createElement('canvas'));
    const localVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
    const remoteVideoRef = useRef<HTMLVideoElement>(document.createElement('video'));
    const vision = useMemo(async () => FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm'), []);
    const imageSegmenter = useMemo(
        async () =>
            await ImageSegmenter.createFromOptions(await vision, {
                baseOptions: { modelAssetPath: '/selfie_segmenter.tflite', delegate: 'GPU' },
                runningMode: 'IMAGE',
                outputCategoryMask: true,
                outputConfidenceMasks: false
            }),
        [vision]
    );

    /** 웹캠을 예측한다. */
    const predictWebcam = useCallback(async () => {
        const localVideo = localVideoRef.current;
        const ctx = isBackground.current
            ? localCanvas.current?.getContext('2d', { willReadFrequently: true })
            : canvasRef.current?.getContext('2d', { willReadFrequently: true });
        if (!ctx || !canvasRef.current) return;

        // remote stream 존재 유무에 따라 Canvas 그리기
        // 하나의 Stream은 Canvas의 너비 * 1/2 크기로 그리며, 전체 비디오 너비의 중앙을 자른다.
        const remoteVideo = remoteVideoRef.current;
        const width = localCanvas.current.width;
        const height = localCanvas.current.height;
        const canvasRatio = width / 2 / height;
        const sy = 0;
        ctx.clearRect(0, 0, width, height);

        if (remoteVideo.autoplay) {
            if (!localVideo || !remoteVideo) return;
            const localVWidth = localVideo?.videoWidth;
            const localVHeight = localVideo?.videoHeight;
            const remoteVWidth = remoteVideo?.videoWidth;
            const remoteVHeight = remoteVideo?.videoHeight;
            const localWidth = localVHeight * canvasRatio;
            const remoteWidth = remoteVHeight * canvasRatio;
            const localX = (localVWidth - localWidth) / 2; // 중앙을 기준으로 잘라내기
            const remoteX = (remoteVWidth - remoteWidth) / 2;
            //local Stream 우측에 그리기
            ctx.drawImage(remoteVideo, remoteX, sy, remoteWidth, remoteVHeight, width / 2, 0, width / 2, height);
            //remote Stream 좌측에 그리기
            ctx.drawImage(localVideo, localX, sy, localWidth, localVHeight, 0, 0, width / 2, height);
        } else {
            if (!localVideo) return;
            const localVWidth = localVideo?.videoWidth;
            const localVHeight = localVideo?.videoHeight;
            const localWidth = localVHeight * canvasRatio;
            const localX = (localVWidth - localWidth) / 2; // 중앙을 기준으로 잘라내기
            //localVideo 중앙에 그리기
            ctx.drawImage(localVideo, localX, sy, localWidth, localVHeight, width / 4, 0, width / 2, height);
        }
        if (!isBackground.current || !bgImageDataRef.current) {
            requestAnimationFrame(predictWebcam);
            return;
        }
        const img = ctx.getImageData(0, 0, width, height);
        (await imageSegmenter).segment(img, handleSegmentForVideo);
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

    /** Stream을 받아 video로 재생해준다. */
    const updateVideo = ({ localVideo, remoteVideo, src }: { localVideo?: HTMLVideoElement; remoteVideo?: HTMLVideoElement; src?: string | null }) => {
        /** stream을 video로 변환한다. */
        if (localVideo) localVideoRef.current = localVideo;
        if (remoteVideo) remoteVideoRef.current = remoteVideo;

        /** canvas size 설정한다. */
        if (canvasRef.current) {
            canvasRef.current.width = canvasRef.current.offsetWidth;
            canvasRef.current.height = canvasRef.current.offsetHeight;
            localCanvas.current.width = canvasRef.current.offsetWidth;
            localCanvas.current.height = canvasRef.current.offsetHeight;
        }
        /** 배경을 설정한다. */
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
