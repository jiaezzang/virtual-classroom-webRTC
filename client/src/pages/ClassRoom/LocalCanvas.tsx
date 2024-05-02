import { useSelfieSegmentation2 } from '@/hooks/useSelfieSegmentation2';
import { RefObject } from 'react';

/**
 * 사용자 비디오를 그리는 Canvas 컴포넌트
 * @returns {JSX.Element} Canvas Component
 */
export default function LocalCanvas({ video, canvasRef }: { video: HTMLVideoElement; canvasRef: RefObject<HTMLCanvasElement> }) {
    useSelfieSegmentation2({ video, canvasRef });
    return <canvas ref={canvasRef} className="top-0 left-0 w-1/2 h-full rounded-3xl object-cover"></canvas>;
}
