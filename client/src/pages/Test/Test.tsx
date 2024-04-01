import './VirtualBackground.css';
import React, { useRef, useEffect } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { SelfieSegmentation } from '@mediapipe/selfie_ssegmentation';
import summer from '@/assets/images/bg/bg_summer.jpg';

const VirtualBackground: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const backgroundImageUrl = summer;

    useEffect(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext('2d');
        if (!canvasCtx) return;

        const selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });

        selfieSegmentation.setOptions({
            modelSelection: 1
        });

        selfieSegmentation.onResults((results) => {
            canvasCtx.save();
            canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.globalCompositeOperation = 'destination-atop';
            canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.globalCompositeOperation = 'destination-over';
            const img = new Image();
            img.src = backgroundImageUrl;
            img.onload = () => {
                canvasCtx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
            };
            canvasCtx.restore();
        });

        const camera = new Camera(videoRef.current, {
            onFrame: async () => {
                await selfieSegmentation.send({ image: videoRef.current as HTMLVideoElement });
            },
            width: 640,
            height: 480
        });
        camera.start();
    }, []);

    return (
        <div className="container">
            <img alt="Background" style={{ display: 'none' }} src={backgroundImageUrl} />
            <video ref={videoRef} className="input_video" style={{ display: 'none' }}></video>
            <div className="canvas-container">
                <canvas ref={canvasRef} className="output_canvas" width="1280" height="720"></canvas>
            </div>
        </div>
    );
};

export default VirtualBackground;
