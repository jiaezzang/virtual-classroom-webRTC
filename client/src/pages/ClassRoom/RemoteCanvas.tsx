import { useSelfieSegmentation } from '@/hooks/useSelfieSegmentation';
import { RefObject, useEffect } from 'react';

/**
 * 사용자 비디오를 그리는 Canvas 컴포넌트
 * @returns {JSX.Element} Canvas Component
 */
export default function RemoteCanvas({ video, canvasRef }: { video: HTMLVideoElement; canvasRef: RefObject<HTMLCanvasElement> }) {
    const { startSelfieSegmentation } = useSelfieSegmentation();

    useEffect(() => {
        if (video) {
            video.autoplay = true;
            video.onloadedmetadata = () => {
                if (canvasRef.current) {
                    canvasRef.current.width = video.videoWidth;
                    canvasRef.current.height = video.videoHeight;
                    startSelfieSegmentation({ video, canvasRef });
                }
            };
        }
    }, [video, canvasRef]);

    return (
        <>
            <canvas ref={canvasRef} className="top-0 left-0 w-1/2 h-full rounded-3xl object-cover"></canvas>
        </>
    );
}
