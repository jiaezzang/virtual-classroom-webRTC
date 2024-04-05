import { RefObject } from 'react';

/**
 * 사용자 비디오를 그리는 Canvas 컴포넌트
 * @returns {JSX.Element} Canvas Component
 */
export default function Canvas({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement> | undefined }) {
    return <canvas ref={canvasRef} className="top-0 rigth-0 w-1/2 h-full rounded-3xl object-cover" />;
}
